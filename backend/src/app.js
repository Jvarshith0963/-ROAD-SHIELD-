require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./config/logger");

const app = express();

// ─────────────────────────────────────────────────────────────
// Trust Proxy
// ─────────────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ─────────────────────────────────────────────────────────────
// Allowed Frontend Origins
// ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://road-shield-frontend.onrender.com",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
    : []),
];

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

// ─────────────────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (Postman, mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }

      if (uniqueOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy: Access denied"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ─────────────────────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────────────────────

// Global limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// Strict limiter for auth routes
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Slow down.",
  },
});

app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────
// Body Parsers
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// HTTP Logging
// ─────────────────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// ─────────────────────────────────────────────────────────────
// Root Route
// ─────────────────────────────────────────────────────────────
app.get("/", (_, res) => {
  res.status(200).json({
    name: "my-api",
    version: "1.0.0",
    status: "ok",
  });
});

// ─────────────────────────────────────────────────────────────
// Health Check Route
// ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────
app.use("/api/auth", strictLimiter);

app.use("/api", routes);

// ─────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;