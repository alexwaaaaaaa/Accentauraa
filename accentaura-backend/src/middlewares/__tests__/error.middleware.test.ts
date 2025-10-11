import { Request, Response, NextFunction } from 'express';
import { errorMiddleware, notFoundMiddleware, asyncErrorHandler } from '../error.middleware';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '../../utils/errors.util';
import logger from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      query: {},
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'test-agent';
        if (header === 'set-cookie') return undefined;
        return undefined;
      }) as any,
    };

    // Setup mock response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    // Setup mock next
    mockNext = jest.fn();
  });

  describe('errorMiddleware', () => {
    it('should handle ValidationError with details', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError(errors);

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Validation failed',
        details: errors,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Invalid token');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User not found');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User not found',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle ConflictError', () => {
      const error = new ConflictError('Email already exists');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email already exists',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle ExternalServiceError', () => {
      const error = new ExternalServiceError('Gemini', 'API timeout');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Gemini service unavailable: API timeout',
        service: 'Gemini',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle generic AppError', () => {
      const error = new AppError(418, "I'm a teapot");

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(418);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "I'm a teapot",
      });
    });

    it('should handle Prisma unique constraint error (P2002)', () => {
      const error: any = new Error('Unique constraint failed');
      error.name = 'PrismaClientKnownRequestError';
      error.code = 'P2002';
      error.meta = { target: ['email'] };

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Resource already exists',
        details: { target: ['email'] },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle Prisma record not found error (P2025)', () => {
      const error: any = new Error('Record not found');
      error.name = 'PrismaClientKnownRequestError';
      error.code = 'P2025';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Resource not found',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle Mongoose validation error', () => {
      const error: any = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Email is required' },
        name: { message: 'Name is required' },
      };

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Validation failed',
        details: [
          { field: 'email', message: 'Email is required' },
          { field: 'name', message: 'Name is required' },
        ],
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle MongoDB duplicate key error', () => {
      const error: any = new Error('Duplicate key');
      error.name = 'MongoServerError';
      error.code = 11000;
      error.keyPattern = { email: 1 };
      error.keyValue = { email: 'test@example.com' };

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Resource already exists',
        details: { email: 1 },
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JWT invalid token error', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JWT expired token error', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Token expired',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle Multer file size limit error', () => {
      const error: any = new Error('File too large');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'File size exceeds limit',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle Multer file count limit error', () => {
      const error: any = new Error('Too many files');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_COUNT';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Too many files uploaded',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JSON syntax error', () => {
      const error: any = new SyntaxError('Unexpected token');
      error.body = '{ invalid json }';

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid JSON in request body',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle unexpected errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Unexpected error');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unexpected error',
          stack: expect.any(String),
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Unexpected error');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include user context in logs when available', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      const error = new UnauthorizedError('Invalid token');

      errorMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Client error:',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });
  });

  describe('notFoundMiddleware', () => {
    it('should create NotFoundError and pass to next', () => {
      notFoundMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route GET /api/test not found',
        })
      );
    });
  });

  describe('asyncErrorHandler', () => {
    it('should catch errors from async functions', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = asyncErrorHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });

    it('should not catch errors when async function succeeds', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncErrorHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
