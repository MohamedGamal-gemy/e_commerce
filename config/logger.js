const winston = require("winston");
const path = require("path");
const fs = require("fs");

const isProd = process.env.NODE_ENV === "production";

/* -------------------------
   Logs directory (DEV only)
-------------------------- */
let logsDir;

if (!isProd) {
  logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/* -------------------------
   Log levels & colors
-------------------------- */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

/* -------------------------
   Formats
-------------------------- */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/* -------------------------
   Transports
-------------------------- */
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (!isProd) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

/* -------------------------
   Logger instance
-------------------------- */
const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  levels,
  defaultMeta: { service: "product-service" },
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});

/* -------------------------
   Service Logger
-------------------------- */
class ServiceLogger {
  static logProductOperation(operation, productId, userId, details = {}) {
    logger.info(`Product ${operation}`, {
      operation,
      productId,
      userId,
      ...details,
    });
  }

  static logCloudinaryOperation(operation, count, duration) {
    logger.info(`Cloudinary ${operation}`, {
      operation,
      count,
      duration: `${duration}ms`,
    });
  }

  static logDatabaseOperation(operation, collection, duration) {
    logger.debug(`Database ${operation}`, {
      operation,
      collection,
      duration: `${duration}ms`,
    });
  }

  static logPerformance(operation, startTime, metadata = {}) {
    const duration = Date.now() - startTime;
    const level = duration > 1000 ? "warn" : "info";

    logger[level](`${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata,
    });
  }

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

  static logError(message, error, context = {}) {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

module.exports = logger;
module.exports.ServiceLogger = ServiceLogger;
