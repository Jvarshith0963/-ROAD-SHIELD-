const axios  = require("axios");
const logger = require("../config/logger");

const ML_BASE    = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT = parseInt(process.env.ML_TIMEOUT_MS || "3000", 10);

const mlClient = axios.create({
  baseURL: ML_BASE,
  timeout: ML_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

mlClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error("ML service error", {
      url:    err.config?.url,
      status: err.response?.status,
      data:   err.response?.data,
      msg:    err.message,
    });
    return Promise.reject(err);
  }
);

/**
 * Call /predict on the ML microservice.
 */
async function predictViolation(payload) {
  try {
    const { data } = await mlClient.post("/predict", payload);
    logger.info("ML prediction", {
      violation: data.violation,
      riskLevel: data.risk_level,
      prob:      data.violation_prob,
    });
    return data;
  } catch (err) {
    // Fallback: rule-based heuristic if ML service is down
    logger.warn("ML service unreachable — using fallback heuristic");
    const excess   = Math.max(payload.actual_speed - payload.speed_limit, 0);
    const violation = excess > 5;
    return {
      violation,
      violation_prob: violation ? 0.85 : 0.10,
      risk_level:     violation ? "HIGH" : "LOW",
      speed_excess:   excess,
      alerts:         violation
        ? [`⚠️ Speed violation (fallback) — ${excess.toFixed(0)} km/h over limit`]
        : [],
      _fallback: true,
    };
  }
}

async function checkMLHealth() {
  try {
    const { data } = await mlClient.get("/health");
    return data;
  } catch {
    return { status: "unavailable", model_loaded: false };
  }
}

module.exports = { predictViolation, checkMLHealth };
