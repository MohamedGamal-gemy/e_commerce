class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super("Validation failed", 400);
    this.errors = errors;
  }
}

class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500);
  }
}

class CloudinaryError extends AppError {
  constructor(message = "Cloudinary operation failed") {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  ValidationError,
  DatabaseError,
  CloudinaryError,
};
