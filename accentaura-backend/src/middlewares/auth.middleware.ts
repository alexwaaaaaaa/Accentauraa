import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { UnauthorizedError } from '../utils/errors.util';
import logger from '../config/logger';

/**
 * JWT Token Payload Interface
 */
export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Extended Request Interface with User Payload
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication Middleware
 * 
 * Extracts and validates JWT from Authorization header.
 * Attaches user payload to request object for downstream use.
 * Handles token expiration and invalid tokens.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Check if header follows Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header format. Expected: Bearer <token>');
    }

    // Extract token (remove "Bearer " prefix and trim whitespace)
    const token = authHeader.substring(7).trim();

    if (!token || token === '') {
      throw new UnauthorizedError('No token provided');
    }

    // Verify and decode token
    const payload = verifyToken(token);

    // Attach user payload to request object
    req.user = payload as TokenPayload;

    // Log successful authentication (exclude sensitive data)
    logger.debug('User authenticated', {
      userId: req.user.userId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof Error) {
      // Check error message from verifyToken utility
      if (error.message === 'Token has expired') {
        logger.warn('Token expired', {
          path: req.path,
          method: req.method,
        });
        return next(new UnauthorizedError('Token has expired'));
      }

      if (error.message === 'Invalid token' || error.message === 'Token verification failed') {
        logger.warn('Invalid token', {
          path: req.path,
          method: req.method,
          error: error.message,
        });
        return next(new UnauthorizedError('Invalid token'));
      }

      if (error.message === 'Token not yet valid') {
        logger.warn('Token not yet valid', {
          path: req.path,
          method: req.method,
        });
        return next(new UnauthorizedError('Token not yet valid'));
      }
    }

    // Pass error to error handling middleware
    next(error);
  }
};

/**
 * Optional Authentication Middleware
 * 
 * Similar to authMiddleware but doesn't throw error if no token is provided.
 * Useful for endpoints that have optional authentication.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7).trim();

    if (!token || token === '') {
      return next();
    }

    // Verify and decode token
    const payload = verifyToken(token);
    req.user = payload as TokenPayload;

    logger.debug('Optional auth: User authenticated', {
      userId: req.user.userId,
      path: req.path,
    });

    next();
  } catch (error) {
    // For optional auth, log but don't block request
    logger.debug('Optional auth: Token validation failed', {
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};
