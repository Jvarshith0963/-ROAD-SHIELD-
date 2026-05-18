require("dotenv").config();
const express   = require("express");
const helmet    = require("helmet");
const cors      = require("cors");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const routes       = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger       = require("./config/logger");

const app = express();

// ── Trust Proxy (required for accurate IPs behind Nginx / load balancers) ────
app.set("trust proxy", 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(",") || "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true,
}));

// Global limiter — generous ceiling for authenticated API traffic
const globalLimiter = rateLimit({
  windowMs:        60_000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests — try again later" },
});

// Strict limiter for sensitive / public-facing routes (auth, password reset, etc.)
const strictLimiter = rateLimit({
  windowMs:        60_000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests — slow down and try again later" },
});

app.use(globalLimiter);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Root Route ─────────────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ name: "my-api", version: "1.0.0", status: "ok" }));

// ── Health Check (before API routes — no auth, no rate-limit overhead) ────────
app.get("/health", (_, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/auth", strictLimiter);   // apply strict limiter to auth routes
app.use("/api", routes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;