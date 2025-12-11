const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

// Format for file output (JSON format)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "product-service" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Custom logging methods for your services
class ServiceLogger {
  /**
   * Log product operations
   */
  static logProductOperation(operation, productId, userId, details = {}) {
    logger.info(`Product ${operation}`, {
      operation,
      productId,
      userId,
      ...details,
    });
  }

  /**
   * Log Cloudinary operations
   */
  static logCloudinaryOperation(operation, count, duration) {
    logger.info(`Cloudinary ${operation}`, {
      operation,
      count,
      duration: `${duration}ms`,
    });
  }

  /**
   * Log database operations
   */
  static logDatabaseOperation(operation, collection, duration) {
    logger.debug(`Database ${operation}`, {
      operation,
      collection,
      duration: `${duration}ms`,
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformance(operation, startTime, metadata = {}) {
    const duration = Date.now() - startTime;
    const level = duration > 1000 ? "warn" : "info";

    logger[level](`${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata,
    });
  }

  /**
   * Log HTTP requests
   */
  static logRequest(req, res, duration) {
    logger.http(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  /**
   * Simple error logging with context
   */
  static logError(message, error, context = {}) {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

// Export both the logger and service logger
module.exports = logger;
module.exports.ServiceLogger = ServiceLogger;
