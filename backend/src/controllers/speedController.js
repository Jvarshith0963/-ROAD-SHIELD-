const { validationResult } = require("express-validator");
const prisma          = require("../config/database");
const { predictViolation } = require("../services/mlService");
const { getWeatherAhead }  = require("../services/weatherService");
const { fanOutAlerts }     = require("../services/alertService");
const logger               = require("../config/logger");

/**
 * POST /api/speed-check
 * Main endpoint: runs ML prediction + weather fetch in parallel,
 * persists result, and fans out real-time alerts.
 */
async function checkSpeed(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const {
      vehicleId,
      zoneType        = "urban",
      speedLimit,
      actualSpeed,
      weatherCondition = "clear",
      hour             = new Date().getHours(),
      roadCondition    = 0.2,
      visibilityM      = 3000,
      trafficDensity   = 50,
      lat,
      lon,
      bearingDeg       = 0,
    } = req.body;

    // Run ML prediction + weather fetch concurrently
    const [mlResult, weatherResult] = await Promise.allSettled([
      predictViolation({
        zone_type:         zoneType,
        weather_condition: weatherCondition,
        speed_limit:       speedLimit,
        actual_speed:      actualSpeed,
        hour,
        road_condition:    roadCondition,
        visibility_m:      visibilityM,
        traffic_density:   trafficDensity,
      }),
      lat && lon ? getWeatherAhead(lat, lon, bearingDeg) : Promise.resolve(null),
    ]);

    const ml      = mlResult.status      === "fulfilled" ? mlResult.value      : null;
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;

    if (mlResult.status === "rejected") {
      logger.error("ML prediction failed", { error: mlResult.reason?.message });
    }

    // Persist speed check record
    const record = await prisma.speedCheck.create({
      data: {
        vehicleId,
        zoneType,
        speedLimit,
        actualSpeed,
        weatherCondition,
        violation:     ml?.violation     ?? false,
        violationProb: ml?.violation_prob ?? 0,
        riskLevel:     ml?.risk_level    ?? "LOW",
        alerts:        [...(ml?.alerts ?? []), ...(weather?.alerts?.map(a => a.message) ?? [])],
        latitude:      lat  ?? null,
        longitude:     lon  ?? null,
      },
    });

    // Fan out real-time alerts (non-blocking)
    fanOutAlerts({ mlResult: ml, weatherResult: weather, vehicleId, lat, lon }).catch(
      (e) => logger.error("Alert fan-out failed", { error: e.message })
    );

    return res.json({
      id:      record.id,
      speed:   { limit: speedLimit, actual: actualSpeed, excess: ml?.speed_excess ?? 0 },
      ml:      ml ?? { error: "ML service unavailable" },
      weather: weather,
      zoneType,
      createdAt: record.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/speed-check/history
 */
async function getHistory(req, res, next) {
  try {
    const { vehicleId, limit = 20 } = req.query;
    const records = await prisma.speedCheck.findMany({
      where:   vehicleId ? { vehicleId } : {},
      orderBy: { createdAt: "desc" },
      take:    parseInt(limit, 10),
    });
    res.json({ records, total: records.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkSpeed, getHistory };
