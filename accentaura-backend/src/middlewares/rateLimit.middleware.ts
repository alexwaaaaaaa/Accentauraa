import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

// Extend Express Request type to include rateLimit property
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

/**
 * General rate limiter for all API endpoints
 * Limits: 100 requests per 15 minutes per IP
 */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : undefined,
    });
  },
});

/**
 * Stricter rate limiter for AI endpoints
 * Limits: 10 requests per 1 minute per IP
 * Applied to computationally expensive AI operations
 */
export const aiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: 'Too many AI requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many AI requests from this IP, please slow down.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : undefined,
    });
  },
  // Skip rate limiting for successful requests that are cached
  skip: (_req: Request) => {
    // Can be extended to skip cached responses
    return false;
  },
});

/**
 * Custom rate limiter factory for creating specialized rate limiters
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests per window
 * @param message - Custom error message
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string = 'Too many requests, please try again later.'
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: req.rateLimit?.resetTime
          ? new Date(req.rateLimit.resetTime).toISOString()
          : undefined,
      });
    },
  });
};
