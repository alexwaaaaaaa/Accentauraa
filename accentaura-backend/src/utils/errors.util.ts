/**
 * Custom Error Classes for Accentaura Backend
 * 
 * Provides a hierarchy of error classes for consistent error handling
 * across the application.
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error for invalid request data
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly errors: any[];

  constructor(errors: any[], message: string = 'Validation failed') {
    super(400, message);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Unauthorized error for missing or invalid authentication
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error for insufficient permissions
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error for missing resources
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error for resource conflicts (e.g., duplicate entries)
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * External service error for third-party service failures
 * HTTP Status: 503 Service Unavailable
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string) {
    super(503, `${service} service unavailable: ${message}`);
    this.service = service;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
