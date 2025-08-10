const winston = require("winston");
const path = require("path");
const config = require("../config");

// Create logs directory if it doesn't exist
const fs = require("fs");
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [],
});

// Add console transport if enabled
if (config.logging.enableConsoleLogging) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    })
  );
}

// Add file transports if enabled
if (config.logging.enableFileLogging) {
  // File transport for all logs
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "bot.log"),
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
    })
  );

  // Separate file for errors
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
    })
  );
}

module.exports = logger;
