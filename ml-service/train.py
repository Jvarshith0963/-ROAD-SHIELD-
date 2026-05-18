"""
ML Pipeline: Speed Violation Classifier
Model: Gradient Boosted Trees (XGBoost via scikit-learn GradientBoostingClassifier)
Justification:
  - Tabular data → tree-based models outperform neural nets
  - Handles mixed feature types natively
  - Strong out-of-box performance; interpretable via feature importance
  - Fast inference (<1 ms) for real-time API
"""
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

DATA_PATH  = Path(__file__).parent / "data" / "speed_violations.csv"
MODEL_DIR  = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "speed_classifier.pkl"
META_PATH  = MODEL_DIR / "model_metadata.json"

FEATURES = [
    "zone_type", "weather_condition", "speed_limit", "actual_speed",
    "hour", "is_rush_hour", "is_night", "road_condition",
    "visibility_m", "traffic_density",
]
TARGET = "violation"


def load_data() -> tuple[pd.DataFrame, pd.Series]:
    log.info("Loading dataset from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    log.info("Shape: %s | Violation rate: %.2f%%", df.shape, df[TARGET].mean() * 100)
    return df[FEATURES], df[TARGET]


def engineer_features(X: pd.DataFrame) -> pd.DataFrame:
    X = X.copy()
    # Speed ratio: how much over/under the limit
    X["speed_ratio"]        = X["actual_speed"] / X["speed_limit"].replace(0, 1)
    X["speed_excess"]       = (X["actual_speed"] - X["speed_limit"]).clip(lower=0)
    X["visibility_norm"]    = X["visibility_m"] / 5000.0
    X["risk_score"]         = (
        X["road_condition"] * 0.4
        + (1 - X["visibility_norm"]) * 0.3
        + X["is_night"] * 0.15
        + X["is_rush_hour"] * 0.15
    )
    return X


def build_pipeline() -> Pipeline:
    clf = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        min_samples_split=20,
        random_state=42,
        n_iter_no_change=20,
        validation_fraction=0.1,
        verbose=0,
    )
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", clf),
    ])


def evaluate(model, X_test, y_test):
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy":  round(accuracy_score(y_test, y_pred), 4),
        "roc_auc":   round(roc_auc_score(y_test, y_proba), 4),
        "report":    classification_report(y_test, y_pred, output_dict=True),
        "confusion": confusion_matrix(y_test, y_pred).tolist(),
    }

    log.info("Accuracy : %.4f", metrics["accuracy"])
    log.info("ROC-AUC  : %.4f", metrics["roc_auc"])
    log.info("\n%s", classification_report(y_test, y_pred))
    return metrics


def cross_validate(model, X, y):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    log.info("5-Fold CV ROC-AUC: %.4f ± %.4f", scores.mean(), scores.std())
    return {"cv_roc_auc_mean": round(scores.mean(), 4), "cv_roc_auc_std": round(scores.std(), 4)}


def main():
    MODEL_DIR.mkdir(exist_ok=True)

    X, y = load_data()
    X    = engineer_features(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    log.info("Train: %d | Test: %d", len(X_train), len(X_test))

    pipeline = build_pipeline()

    log.info("Training GradientBoostingClassifier …")
    pipeline.fit(X_train, y_train)

    test_metrics = evaluate(pipeline, X_test, y_test)
    cv_metrics   = cross_validate(pipeline, X, y)

    # Feature importances (from the GBM step)
    feature_names = X.columns.tolist()
    importances   = pipeline.named_steps["clf"].feature_importances_
    fi = dict(sorted(zip(feature_names, importances.tolist()), key=lambda x: -x[1]))
    log.info("Top features: %s", list(fi.items())[:5])

    # Save model
    joblib.dump(pipeline, MODEL_PATH)
    log.info("Model saved → %s", MODEL_PATH)

    # Save metadata
    metadata = {
        "features":    feature_names,
        "model_type":  "GradientBoostingClassifier",
        "test_metrics": test_metrics,
        "cv_metrics":   cv_metrics,
        "feature_importance": fi,
    }
    META_PATH.write_text(json.dumps(metadata, indent=2))
    log.info("Metadata saved → %s", META_PATH)


if __name__ == "__main__":
    main()
