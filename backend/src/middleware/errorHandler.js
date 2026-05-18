const logger = require("../config/logger");

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  logger.error("Unhandled error", {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  res.status(status).json({
    error: {
      message: isProd && status === 500 ? "Internal Server Error" : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
