"""
FastAPI ML Inference Service
Exposes the trained speed violation classifier as a REST API.
"""
import json
import logging
import os
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "model" / "speed_classifier.pkl"
META_PATH  = Path(__file__).parent / "model" / "model_metadata.json"

app = FastAPI(
    title="Smart Road Safety — ML Service",
    version="1.0.0",
    description="Speed violation prediction & risk scoring",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model loading (at startup)
# ---------------------------------------------------------------------------
_model = None
_metadata: dict = {}

@app.on_event("startup")
def load_model():
    global _model, _metadata
    if not MODEL_PATH.exists():
        log.warning("Model not found at %s — run train.py first", MODEL_PATH)
        return
    _model = joblib.load(MODEL_PATH)
    _metadata = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}
    log.info("Model loaded | features: %s", _metadata.get("features", []))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
ZONE_MAP    = {"school": 0, "hospital": 1, "residential": 2, "highway": 3, "urban": 4}
WEATHER_MAP = {"clear": 0, "rain": 1, "fog": 2, "snow": 3, "storm": 4}

class PredictRequest(BaseModel):
    zone_type:         str   = Field(..., example="school")
    weather_condition: str   = Field(..., example="rain")
    speed_limit:       float = Field(..., ge=5, le=130)
    actual_speed:      float = Field(..., ge=0, le=250)
    hour:              int   = Field(..., ge=0, le=23)
    road_condition:    float = Field(0.2, ge=0.0, le=1.0)
    visibility_m:      float = Field(3000.0, ge=50, le=5000)
    traffic_density:   float = Field(50.0, ge=0)

    @validator("zone_type")
    def validate_zone(cls, v):
        if v not in ZONE_MAP:
            raise ValueError(f"zone_type must be one of {list(ZONE_MAP)}")
        return v

    @validator("weather_condition")
    def validate_weather(cls, v):
        if v not in WEATHER_MAP:
            raise ValueError(f"weather_condition must be one of {list(WEATHER_MAP)}")
        return v


class PredictResponse(BaseModel):
    violation:        bool
    violation_prob:   float
    risk_level:       str        # LOW / MEDIUM / HIGH / CRITICAL
    speed_excess:     float
    alerts:           list[str]


class HealthResponse(BaseModel):
    status:      str
    model_loaded: bool
    model_type:  Optional[str]
    test_roc_auc: Optional[float]


# ---------------------------------------------------------------------------
# Feature engineering (must mirror train.py)
# ---------------------------------------------------------------------------
def build_feature_row(req: PredictRequest) -> pd.DataFrame:
    is_rush = int(7 <= req.hour <= 9 or 17 <= req.hour <= 19)
    is_night = int(req.hour >= 22 or req.hour <= 5)

    row = {
        "zone_type":          ZONE_MAP[req.zone_type],
        "weather_condition":  WEATHER_MAP[req.weather_condition],
        "speed_limit":        req.speed_limit,
        "actual_speed":       req.actual_speed,
        "hour":               req.hour,
        "is_rush_hour":       is_rush,
        "is_night":           is_night,
        "road_condition":     req.road_condition,
        "visibility_m":       req.visibility_m,
        "traffic_density":    req.traffic_density,
        # Engineered features
        "speed_ratio":        req.actual_speed / max(req.speed_limit, 1),
        "speed_excess":       max(req.actual_speed - req.speed_limit, 0),
        "visibility_norm":    req.visibility_m / 5000.0,
        "risk_score":         (
            req.road_condition * 0.4
            + (1 - req.visibility_m / 5000.0) * 0.3
            + is_night * 0.15
            + is_rush * 0.15
        ),
    }
    return pd.DataFrame([row])


def risk_level(prob: float) -> str:
    if prob < 0.30: return "LOW"
    if prob < 0.55: return "MEDIUM"
    if prob < 0.80: return "HIGH"
    return "CRITICAL"


def build_alerts(req: PredictRequest, violation: bool, excess: float) -> list[str]:
    alerts = []
    if violation:
        alerts.append(f"⚠️ Speed violation detected — {excess:.0f} km/h over limit")
    zone_msgs = {
        "school":    "🏫 School Zone — max {lim} km/h",
        "hospital":  "🏥 Hospital Zone — reduce speed",
        "residential": "🏘️ Residential Area — watch for pedestrians",
    }
    if req.zone_type in zone_msgs:
        alerts.append(zone_msgs[req.zone_type].format(lim=int(req.speed_limit)))
    weather_alerts = {
        "rain":  "🌧️ Wet roads — increase following distance",
        "fog":   "🌫️ Low visibility ahead — use fog lights",
        "snow":  "❄️ Icy conditions — reduce speed significantly",
        "storm": "⛈️ Severe storm ahead — consider stopping",
    }
    if req.weather_condition in weather_alerts:
        alerts.append(weather_alerts[req.weather_condition])
    if req.visibility_m < 200:
        alerts.append("👁️ Visibility below 200 m — extreme caution")
    return alerts


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status":      "ok",
        "model_loaded": _model is not None,
        "model_type":  _metadata.get("model_type"),
        "test_roc_auc": _metadata.get("test_metrics", {}).get("roc_auc"),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if _model is None:
        raise HTTPException(503, "Model not loaded — run train.py first")

    X = build_feature_row(req)
    prob      = float(_model.predict_proba(X)[0][1])
    violation = prob >= 0.50
    excess    = max(req.actual_speed - req.speed_limit, 0)

    return {
        "violation":      violation,
        "violation_prob": round(prob, 4),
        "risk_level":     risk_level(prob),
        "speed_excess":   round(excess, 1),
        "alerts":         build_alerts(req, violation, excess),
    }


@app.get("/model/info")
def model_info():
    if not _metadata:
        raise HTTPException(404, "Model metadata not found")
    return _metadata


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("ML_PORT", 8000)), reload=False)
