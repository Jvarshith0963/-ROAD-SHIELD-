const { Prisma } = require("@prisma/client");
const { getRecentAlerts, acknowledgeAlert } = require("../services/alertService");
const logger = require("../config/logger");

async function listAlerts(req, res, next) {
  try {
    const { vehicleId, limit, unacknowledgedOnly } = req.query;
    const alerts = await getRecentAlerts({
      vehicleId,
      limit:              parseInt(limit || "50", 10),
      unacknowledgedOnly: unacknowledgedOnly === "true",
    });
    res.json({ alerts, total: alerts.length });
  } catch (err) {
    next(err);
  }
}

async function ackAlert(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await acknowledgeAlert(id);
    res.json({ success: true, alert: updated });
  } catch (err) {
    logger.error("Ack alert failed", { id: req.params.id, error: err.message });

    if (err.code === "P2025") {
      return res.status(404).json({ success: false, error: `Alert '${req.params.id}' not found` });
    }

    next(err);
  }
}

module.exports = { listAlerts, ackAlert };