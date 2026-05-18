require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const logger = require("./config/logger");
const prisma = require("./config/database");
const { initAlertService } = require("./services/alertService");

const PORT = parseInt(process.env.PORT || "4000", 10);

// ─────────────────────────────────────────────────────────────
// Create HTTP Server
// ─────────────────────────────────────────────────────────────
const server = http.createServer(app);

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

// Remove duplicate origins
const uniqueOrigins = [...new Set(allowedOrigins)];

// ─────────────────────────────────────────────────────────────
// Socket.IO Configuration
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests without origin (Postman, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      if (uniqueOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Socket.IO CORS policy violation"));
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },

  transports: ["websocket", "polling"],
});

// ─────────────────────────────────────────────────────────────
// Socket Events
// ─────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  logger.info("WebSocket client connected", {
    socketId: socket.id,
  });

  // Vehicle room subscription
  socket.on("subscribe:vehicle", (vehicleId) => {
    if (!vehicleId) {
      return;
    }

    const room = `vehicle:${vehicleId}`;

    socket.join(room);

    logger.debug("Client subscribed to vehicle room", {
      socketId: socket.id,
      vehicleId,
      room,
    });
  });

  // Disconnect event
  socket.on("disconnect", (reason) => {
    logger.info("WebSocket client disconnected", {
      socketId: socket.id,
      reason,
    });
  });

  // Error handling
  socket.on("error", (error) => {
    logger.error("Socket error", {
      socketId: socket.id,
      error: error.message,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Initialize Alert Service
// ─────────────────────────────────────────────────────────────
initAlertService(io);

// ─────────────────────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────────────────────
async function shutdown(signal) {
  try {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      try {
        // Disconnect Prisma
        await prisma.$disconnect();

        logger.info("Database disconnected");
        logger.info("Server shutdown complete");

        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", {
          error: error.message,
        });

        process.exit(1);
      }
    });

    // Force shutdown timeout
    setTimeout(() => {
      logger.error("Forced shutdown due to timeout");
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error("Shutdown failure", {
      error: error.message,
    });

    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`🚦 Smart Road Safety backend running on port ${PORT}`);

  logger.info("Environment details", {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT,
  });

  logger.info("Allowed frontend origins", {
    origins: uniqueOrigins,
  });
});