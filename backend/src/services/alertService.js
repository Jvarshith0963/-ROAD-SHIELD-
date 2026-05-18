const prisma = require("../config/database");
const logger = require("../config/logger");

let _io = null;

function initAlertService(io) {
  _io = io;
  logger.info("Alert service initialised with Socket.io");
}

async function createAlert({ type, severity, message, vehicleId, latitude, longitude }) {
  try {
    const alert = await prisma.alert.create({
      data: { type, severity, message, vehicleId, latitude, longitude },
    });

    logger.info("Alert created", { id: alert.id, type, severity });

    if (_io) {
      _io.emit("alert", {
        id:        alert.id,
        type,
        severity,
        message,
        vehicleId,
        createdAt: alert.createdAt,
      });
    }

    return alert;
  } catch (err) {
    logger.error("Failed to create alert", { error: err.message });
    throw err;
  }
}

async function acknowledgeAlert(id) {
  if (!id) throw new Error("Alert id is required");

  logger.info("Attempting to acknowledge alert", { id });

  const existing = await prisma.alert.findUnique({ where: { id } });

  if (!existing) {
    logger.warn("Alert not found for acknowledgement", { id });
    const error = new Error(`Alert not found: ${id}`);
    error.code = "P2025";
    throw error;
  }

  return prisma.alert.update({
    where: { id },
    data: { acknowledged: true },
  });
}

async function getRecentAlerts({ limit = 50, vehicleId, unacknowledgedOnly = false } = {}) {
  return prisma.alert.findMany({
    where: {
      ...(vehicleId ? { vehicleId } : {}),
      ...(unacknowledgedOnly ? { acknowledged: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function fanOutAlerts({ mlResult, weatherResult, vehicleId, lat, lon }) {
  const tasks = [];

  if (mlResult?.violation) {
    tasks.push(createAlert({
      type:      "SPEED",
      severity:  mlResult.risk_level,
      message:   `Speed violation — ${mlResult.speed_excess.toFixed(0)} km/h over limit`,
      vehicleId,
      latitude:  lat,
      longitude: lon,
    }));
  }

  for (const wa of (weatherResult?.alerts ?? [])) {
    tasks.push(createAlert({
      type:      "WEATHER",
      severity:  wa.severity,
      message:   wa.message,
      vehicleId,
      latitude:  lat,
      longitude: lon,
    }));
  }

  return Promise.allSettled(tasks);
}

module.exports = { initAlertService, createAlert, acknowledgeAlert, getRecentAlerts, fanOutAlerts };