class AppError extends Error {
  constructor(message, status = 500, errors = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 0) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ConflictError,
};
