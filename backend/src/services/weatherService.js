const axios  = require("axios");
const prisma = require("../config/database");
const logger = require("../config/logger");

const OWM_BASE   = "https://api.openweathermap.org/data/2.5";
const CACHE_TTL  = 10 * 60 * 1000;  // 10 minutes
const AHEAD_KM   = 10;              // look 10 km ahead

/**
 * Project coordinates ~10 km in direction of travel.
 * Bearing 0 = north. Simple flat-earth approximation (accurate at road scales).
 */
function projectCoords(lat, lon, bearingDeg = 0, distanceKm = AHEAD_KM) {
  const R    = 6371;
  const d    = distanceKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: parseFloat(((lat2 * 180) / Math.PI).toFixed(6)),
    lon: parseFloat(((lon2 * 180) / Math.PI).toFixed(6)),
  };
}

/**
 * Check DB cache before hitting OWM.
 */
async function getCachedWeather(lat, lon) {
  const now     = new Date();
  const rounded = { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };

  const cached = await prisma.weatherCache.findFirst({
    where: {
      lat:       { gte: rounded.lat - 0.1, lte: rounded.lat + 0.1 },
      lon:       { gte: rounded.lon - 0.1, lte: rounded.lon + 0.1 },
      expiresAt: { gt: now },
    },
    orderBy: { fetchedAt: "desc" },
  });

  return cached?.data ?? null;
}

async function saveWeatherCache(lat, lon, data) {
  await prisma.weatherCache.create({
    data: {
      lat,
      lon,
      data,
      expiresAt: new Date(Date.now() + CACHE_TTL),
    },
  });
}

/**
 * Normalize OWM response into a compact structure.
 */
function normalizeWeather(owm) {
  const w = owm.weather?.[0] ?? {};
  return {
    condition:    w.main?.toLowerCase() ?? "clear",
    description:  w.description ?? "",
    icon:         w.icon,
    temp:         owm.main?.temp,
    feelsLike:    owm.main?.feels_like,
    humidity:     owm.main?.humidity,
    windSpeed:    owm.wind?.speed,
    visibility:   owm.visibility ?? 10000,  // metres, default 10 km
    cityName:     owm.name,
    alerts:       buildWeatherAlerts(w.main, owm.visibility, owm.wind?.speed),
  };
}

function buildWeatherAlerts(weatherMain, visibility, windSpeed) {
  const alerts = [];
  const cond   = weatherMain?.toLowerCase() ?? "";

  if (cond.includes("thunderstorm") || cond.includes("storm"))
    alerts.push({ severity: "CRITICAL", message: "⛈️ Severe thunderstorm ahead — consider stopping" });
  else if (cond.includes("snow") || cond.includes("blizzard"))
    alerts.push({ severity: "HIGH", message: "❄️ Snow/ice ahead — reduce speed by 40%" });
  else if (cond.includes("fog") || (visibility && visibility < 500))
    alerts.push({ severity: "HIGH", message: "🌫️ Dense fog — visibility below 500 m, use fog lights" });
  else if (cond.includes("rain") || cond.includes("drizzle"))
    alerts.push({ severity: "MEDIUM", message: "🌧️ Rain ahead — wet roads, increase following distance" });
  else if (cond.includes("haze") && visibility && visibility < 2000)
    alerts.push({ severity: "MEDIUM", message: "😶‍🌫️ Hazy conditions — reduced visibility ahead" });

  if (windSpeed && windSpeed > 15)
    alerts.push({ severity: "MEDIUM", message: `💨 Strong winds (${windSpeed.toFixed(0)} m/s) — watch high-sided vehicles` });

  return alerts;
}

/**
 * Main: fetch weather 10 km ahead of current position.
 */
async function getWeatherAhead(lat, lon, bearingDeg = 0) {
  const ahead = projectCoords(lat, lon, bearingDeg);
  logger.info("Fetching weather", { current: { lat, lon }, ahead, bearing: bearingDeg });

  const cached = await getCachedWeather(ahead.lat, ahead.lon);
  if (cached) {
    logger.debug("Weather cache hit", { lat: ahead.lat, lon: ahead.lon });
    return { ...cached, cached: true };
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) throw new Error("WEATHER_API_KEY env var not set");

  const { data } = await axios.get(`${OWM_BASE}/weather`, {
    params: { lat: ahead.lat, lon: ahead.lon, appid: apiKey, units: "metric" },
    timeout: 5000,
  });

  const normalized = normalizeWeather(data);
  await saveWeatherCache(ahead.lat, ahead.lon, normalized).catch((e) =>
    logger.warn("Weather cache save failed", { error: e.message })
  );

  return { ...normalized, cached: false };
}

module.exports = { getWeatherAhead, projectCoords, buildWeatherAlerts };
