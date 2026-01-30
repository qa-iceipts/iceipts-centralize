require("dotenv").config();
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const config = require("./config/gateway.config");
const logger = require("./helpers/logger");
const { notFoundHandler, globalErrorHandler } = require("./middleware/error.handler");
//call db helper to initialize DB connection
require("./helpers/dbhelper");

logger.info("Starting Central Gateway Service...");

// Apply security and performance middlewares
app.use(helmet());
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

// Custom response helpers
app.response.sendResponse = function (data, message, statusCode = 200) {
  return this.status(statusCode).send({
    success: true,
    status: statusCode,
    message: message,
    data: data,
  });
};

app.response.sendError = function (err) {
  const { statusCode = 500, message, stack, expose } = err;
  return this.status(parseInt(statusCode)).send({
    success: false,
    status: statusCode,
    expose: expose,
    error_message: message,
    ...(process.env.NODE_ENV === 'development' && { error_stack: stack }),
  });
};

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logResponse(req, res, responseTime);
  });
  
  logger.logRequest(req);
  next();
});

// Basic health check endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Central Gateway Service",
    status: "UP",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

// Routes
app.use("/api/health", require("./routes/health.routes"));
app.use("/api/metrics", require("./routes/metrics.routes"));
app.use("/api/gateway", require("./routes/gateway.routes"));

// External API Gateway routes with rate limiting
const { vahanRateLimiter, ewayRateLimiter, einvoiceRateLimiter } = require("./middleware/api-rate-limiter");
app.use("/api/gateway/vahan", vahanRateLimiter, require("./routes/vahan.routes"));
app.use("/api/gateway/eway", ewayRateLimiter, require("./routes/eway.routes"));
app.use("/api/gateway/einvoice", einvoiceRateLimiter, require("./routes/einvoice.routes"));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown function
function gracefulShutdown() {
  logger.info("Received shutdown signal, closing server gracefully...");

  server.close(async () => {
    logger.info("HTTP server closed");

    // RabbitMQ removed - event publishing disabled
    // Redis removed - caching disabled

    // Close database connections
    try {
      const db = require("./helpers/dbhelper");
      if (db.sequelize) {
        await db.sequelize.close();
        logger.info("Database connections closed");
      }
    } catch (error) {
      logger.warn("Error closing database connections", { error: error.message });
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 30000);
}

// Start server
let server;
async function start() {
  try {
    logger.info("Initializing database connection...");
    const db = await require("./helpers/dbhelper");

    // RabbitMQ event consumer disabled - removed for now
    // logger.info("Event queue disabled (RabbitMQ removed) - events will be logged only");

    // Redis caching disabled - removed for now
    // logger.info("Caching disabled (Redis removed) - all API calls will hit external services directly");

    const port = config.server.port;
    server = app.listen(port, () => {
      logger.info(`Central Gateway Service listening on port ${port}`);
      logger.info(`Environment: ${config.server.env}`);
    });

    // Set up graceful shutdown handlers
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Server startup failed", { error: error.toString(), stack: error.stack });
    process.exit(1);
  }
}

start();

module.exports = app;
