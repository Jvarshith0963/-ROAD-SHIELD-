const { Router } = require("express");
const { body, query } = require("express-validator");

const { checkSpeed, getHistory }      = require("../controllers/speedController");
const { getWeather }                  = require("../controllers/weatherController");
const { listAlerts, ackAlert }        = require("../controllers/alertController");
const { checkMLHealth }               = require("../services/mlService");

const router = Router();

// ── Health ──────────────────────────────────────────────────────────────────
router.get("/health", async (_req, res) => {
  const ml = await checkMLHealth();
  res.json({ status: "ok", ml, timestamp: new Date() });
});

// ── Speed Check ─────────────────────────────────────────────────────────────
router.post(
  "/speed-check",
  [
    body("vehicleId").isString().notEmpty(),
    body("speedLimit").isFloat({ min: 5, max: 130 }),
    body("actualSpeed").isFloat({ min: 0, max: 250 }),
    body("zoneType").optional().isIn(["school","hospital","residential","highway","urban"]),
    body("lat").optional().isFloat({ min: -90,  max: 90  }),
    body("lon").optional().isFloat({ min: -180, max: 180 }),
  ],
  checkSpeed
);

router.get("/speed-check/history", getHistory);

// ── Weather ──────────────────────────────────────────────────────────────────
router.get(
  "/weather",
  [
    query("lat").isFloat({ min: -90,  max: 90  }),
    query("lon").isFloat({ min: -180, max: 180 }),
    query("bearing").optional().isFloat({ min: 0, max: 360 }),
  ],
  getWeather
);

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get( "/alerts",          listAlerts);
router.patch("/alerts/:id/ack", ackAlert);

module.exports = router;
