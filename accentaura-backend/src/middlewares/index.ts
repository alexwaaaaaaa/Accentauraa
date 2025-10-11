/**
 * Middleware exports
 * Central export point for all middleware functions
 */

export {
  errorMiddleware,
  notFoundMiddleware,
  asyncErrorHandler,
} from './error.middleware';

export {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthenticatedRequest,
  type TokenPayload,
} from './auth.middleware';

export {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
} from './validation.middleware';

export {
  uploadAudio,
  uploadVideo,
  uploadAudioVideo,
  uploadSingleAudio,
  uploadSingleVideo,
  uploadInterviewFiles,
} from './upload.middleware';

export {
  generalRateLimiter,
  aiRateLimiter,
  createRateLimiter,
} from './rateLimit.middleware';

export {
  corsMiddleware,
  permissiveCorsMiddleware,
  corsOptions,
  permissiveCorsOptions,
} from './cors.middleware';
