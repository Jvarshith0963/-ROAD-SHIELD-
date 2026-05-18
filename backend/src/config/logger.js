const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const { combine, timestamp, printf, colorize, errors, json } = format;

const isProd = process.env.NODE_ENV === "production";

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    isProd ? json() : combine(colorize(), logFormat)
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename:    path.join("logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level:       "error",
      maxFiles:    "14d",
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename:    path.join("logs", "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles:    "7d",
      zippedArchive: true,
    }),
  ],
});

module.exports = logger;
