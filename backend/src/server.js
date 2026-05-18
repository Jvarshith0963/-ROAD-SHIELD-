require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app    = require("./app");
const logger = require("./config/logger");
const prisma = require("./config/database");
const { initAlertService } = require("./services/alertService");

const PORT = parseInt(process.env.PORT || "4000", 10);

const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  logger.info("WS client connected", { id: socket.id });

  socket.on("subscribe:vehicle", (vehicleId) => {
    socket.join(`vehicle:${vehicleId}`);
    logger.debug("Client subscribed to vehicle", { socketId: socket.id, vehicleId });
  });

  socket.on("disconnect", () => {
    logger.info("WS client disconnected", { id: socket.id });
  });
});

initAlertService(io);

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`🚦 Smart Road Safety backend running on port ${PORT}`);
  logger.info(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});
