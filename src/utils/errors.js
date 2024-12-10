class BaseError extends Error {
    constructor(message, statusCode, errors = []) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.errors = errors;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  class ValidationError extends BaseError {
    constructor(message, errors = []) {
      super(message, 400, errors);
    }
  }
  
  class AuthenticationError extends BaseError {
    constructor(message) {
      super(message, 401);
    }
  }
  
  class AuthorizationError extends BaseError {
    constructor(message) {
      super(message, 403);
    }
  }
  
  class NotFoundError extends BaseError {
    constructor(message) {
      super(message, 404);
    }
  }
  
  class ConflictError extends BaseError {
    constructor(message) {
      super(message, 409);
    }
  }
  
  class RateLimitError extends BaseError {
    constructor(message) {
      super(message, 429);
    }
  }
  
  class InternalServerError extends BaseError {
    constructor(message = 'Internal Server Error') {
      super(message, 500);
    }
  }
  
  module.exports = {
    BaseError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalServerError
  };