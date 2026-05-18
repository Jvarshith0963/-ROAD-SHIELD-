const { validationResult } = require("express-validator");
const { getWeatherAhead }  = require("../services/weatherService");
const logger               = require("../config/logger");

async function getWeather(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { lat, lon, bearing = 0 } = req.query;
    const weather = await getWeatherAhead(parseFloat(lat), parseFloat(lon), parseFloat(bearing));
    res.json({ weather, fetchedAt: new Date() });
  } catch (err) {
    logger.error("Weather fetch failed", { error: err.message });
    next(err);
  }
}

module.exports = { getWeather };
