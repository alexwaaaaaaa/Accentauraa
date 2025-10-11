import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
} from '../utils/errors.util';
import { captureException } from '../config/monitoring';
import { sendAlert, AlertSeverity, AlertCategory } from '../config/alerts';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Error Middleware for Accentaura Backend
 * 
 * Global error handler that:
 * - Logs errors with Winston
 * - Returns appropriate HTTP status codes
 * - Formats error responses for mobile app
 * - Handles both operational and programming errors
 * 
 * Requirements: 11.1, 11.2
 */

/**
 * Extract user ID from request for logging context
 */
function getUserIdFromRequest(req: Request): string | undefined {
  // Check if user is attached to request (from auth middleware)
  if (req.user && typeof req.user === 'object' && 'userId' in req.user) {
    return (req.user as any).userId;
  }
  return undefined;
}

/**
 * Global error handling middleware
 * Must be registered after all routes
 * 
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param _next - Express next function (unused but required for Express error middleware signature)
 */
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Extract request context for logging
  const requestContext = {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: getUserIdFromRequest(req),
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Handle operational errors (AppError and its subclasses)
  if (err instanceof AppError) {
    // Log operational errors at appropriate level
    if (err.statusCode >= 500) {
      logger.error('Operational error:', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        ...requestContext,
      });
      
      // Send alert for server errors
      sendAlert({
        severity: AlertSeverity.ERROR,
        category: AlertCategory.SYSTEM,
        message: `Operational error: ${err.message}`,
        error: err,
        context: requestContext,
      });
      
      // Capture in Sentry
      captureException(err, requestContext);
    } else {
      logger.warn('Client error:', {
        message: err.message,
        statusCode: err.statusCode,
        ...requestContext,
      });
    }

    // Handle specific error types
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        message: err.message,
        details: err.errors,
      });
      return;
    }

    if (err instanceof ExternalServiceError) {
      res.status(err.statusCode).json({
        message: err.message,
        service: err.service,
      });
      return;
    }

    // Generic AppError response
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    logger.error('Prisma error:', {
      code: prismaError.code,
      message: err.message,
      meta: prismaError.meta,
      ...requestContext,
    });

    // Handle specific Prisma error codes
    if (prismaError.code === 'P2002') {
      // Unique constraint violation
      res.status(409).json({
        message: 'Resource already exists',
        details: prismaError.meta,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      // Record not found
      res.status(404).json({
        message: 'Resource not found',
      });
      return;
    }

    // Generic Prisma error
    res.status(500).json({
      message: 'Database error occurred',
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError' && 'errors' in err) {
    const mongooseError = err as any;
    
    logger.warn('Mongoose validation error:', {
      message: err.message,
      errors: mongooseError.errors,
      ...requestContext,
    });

    res.status(400).json({
      message: 'Validation failed',
      details: Object.keys(mongooseError.errors).map((key) => ({
        field: key,
        message: mongooseError.errors[key].message,
      })),
    });
    return;
  }

  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const mongoError = err as any;
    
    logger.warn('MongoDB duplicate key error:', {
      message: err.message,
      keyPattern: mongoError.keyPattern,
      keyValue: mongoError.keyValue,
      ...requestContext,
    });

    res.status(409).json({
      message: 'Resource already exists',
      details: mongoError.keyPattern,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('JWT error:', {
      message: err.message,
      ...requestContext,
    });

    res.status(401).json({
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('JWT expired:', {
      message: err.message,
      ...requestContext,
    });

    res.status(401).json({
      message: 'Token expired',
    });
    return;
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    const multerError = err as any;
    
    logger.warn('File upload error:', {
      message: err.message,
      code: multerError.code,
      field: multerError.field,
      ...requestContext,
    });

    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        message: 'File size exceeds limit',
      });
      return;
    }

    if (multerError.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        message: 'Too many files uploaded',
      });
      return;
    }

    res.status(400).json({
      message: 'File upload error',
    });
    return;
  }

  // Handle SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('JSON parse error:', {
      message: err.message,
      ...requestContext,
    });

    res.status(400).json({
      message: 'Invalid JSON in request body',
    });
    return;
  }

  // Handle unexpected/programming errors
  logger.error('Unexpected error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...requestContext,
  });
  
  // Send critical alert for unexpected errors
  sendAlert({
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.SYSTEM,
    message: `Unexpected error: ${err.message}`,
    error: err,
    context: requestContext,
    notifyImmediately: true,
  });
  
  // Capture in Sentry
  captureException(err, requestContext);

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler for unmatched routes
 * Should be registered after all routes but before error middleware
 * 
 * @param req - Express request
 * @param _res - Express response (unused)
 * @param next - Express next function
 */
export function notFoundMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Async error wrapper to catch errors in async route handlers
 * Eliminates need for try-catch in every async route
 * 
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 * 
 * @example
 * router.get('/users', asyncErrorHandler(async (req, res) => {
 *   const users = await userService.getUsers();
 *   res.json(users);
 * }));
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
