import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '../errors.util';

describe('Error Utility Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const statusCode = 500;
      const message = 'Internal server error';
      const error = new AppError(statusCode, message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(statusCode);
      expect(error.message).toBe(message);
      expect(error.isOperational).toBe(true);
    });

    it('should set isOperational to false when specified', () => {
      const error = new AppError(500, 'Critical error', false);

      expect(error.isOperational).toBe(false);
    });

    it('should default isOperational to true', () => {
      const error = new AppError(500, 'Error message');

      expect(error.isOperational).toBe(true);
    });

    it('should maintain proper stack trace', () => {
      const error = new AppError(500, 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('errors.util.test.ts');
    });

    it('should be catchable as Error', () => {
      try {
        throw new AppError(500, 'Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it('should support instanceof checks', () => {
      const error = new AppError(500, 'Test error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should handle different status codes', () => {
      const statusCodes = [400, 401, 403, 404, 409, 500, 503];

      statusCodes.forEach(code => {
        const error = new AppError(code, `Error ${code}`);
        expect(error.statusCode).toBe(code);
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct properties', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError(errors);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const errors = [{ field: 'password', message: 'Too short' }];
      const customMessage = 'Custom validation error';
      const error = new ValidationError(errors, customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.errors).toEqual(errors);
    });

    it('should handle multiple validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' },
        { field: 'name', message: 'Name is required' },
      ];
      const error = new ValidationError(errors);

      expect(error.errors).toHaveLength(3);
      expect(error.errors).toEqual(errors);
    });

    it('should handle empty errors array', () => {
      const error = new ValidationError([]);

      expect(error.errors).toEqual([]);
      expect(error.statusCode).toBe(400);
    });

    it('should support instanceof checks', () => {
      const error = new ValidationError([]);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const customMessage = 'Invalid credentials';
      const error = new UnauthorizedError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(401);
    });

    it('should support instanceof checks', () => {
      const error = new UnauthorizedError();

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof UnauthorizedError).toBe(true);
    });

    it('should handle different unauthorized scenarios', () => {
      const scenarios = [
        'Token expired',
        'Invalid token',
        'No token provided',
        'Insufficient permissions',
      ];

      scenarios.forEach(message => {
        const error = new UnauthorizedError(message);
        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(401);
      });
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const customMessage = 'Access denied to this resource';
      const error = new ForbiddenError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(403);
    });

    it('should support instanceof checks', () => {
      const error = new ForbiddenError();

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ForbiddenError).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const customMessage = 'User not found';
      const error = new NotFoundError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(404);
    });

    it('should support instanceof checks', () => {
      const error = new NotFoundError();

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });

    it('should handle different resource types', () => {
      const resources = ['User', 'Lesson', 'Progress', 'Badge'];

      resources.forEach(resource => {
        const error = new NotFoundError(`${resource} not found`);
        expect(error.message).toBe(`${resource} not found`);
        expect(error.statusCode).toBe(404);
      });
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError with default message', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource conflict');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const customMessage = 'Email already exists';
      const error = new ConflictError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(409);
    });

    it('should support instanceof checks', () => {
      const error = new ConflictError();

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
    });

    it('should handle different conflict scenarios', () => {
      const conflicts = [
        'Email already registered',
        'Username taken',
        'Duplicate entry',
        'Resource already exists',
      ];

      conflicts.forEach(message => {
        const error = new ConflictError(message);
        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(409);
      });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an ExternalServiceError with correct properties', () => {
      const service = 'Gemini API';
      const message = 'Connection timeout';
      const error = new ExternalServiceError(service, message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe(`${service} service unavailable: ${message}`);
      expect(error.service).toBe(service);
      expect(error.isOperational).toBe(true);
    });

    it('should format message correctly', () => {
      const service = 'FastAPI';
      const message = 'Service down';
      const error = new ExternalServiceError(service, message);

      expect(error.message).toBe('FastAPI service unavailable: Service down');
    });

    it('should support instanceof checks', () => {
      const error = new ExternalServiceError('TestService', 'Error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ExternalServiceError).toBe(true);
    });

    it('should handle different external services', () => {
      const services = [
        { name: 'Gemini API', error: 'Rate limit exceeded' },
        { name: 'PostgreSQL', error: 'Connection refused' },
        { name: 'MongoDB', error: 'Timeout' },
        { name: 'Redis', error: 'Connection lost' },
      ];

      services.forEach(({ name, error: errorMsg }) => {
        const error = new ExternalServiceError(name, errorMsg);
        expect(error.service).toBe(name);
        expect(error.message).toContain(name);
        expect(error.message).toContain(errorMsg);
        expect(error.statusCode).toBe(503);
      });
    });

    it('should store service name separately', () => {
      const service = 'AWS S3';
      const error = new ExternalServiceError(service, 'Upload failed');

      expect(error.service).toBe(service);
    });
  });

  describe('Error Hierarchy', () => {
    it('should maintain proper inheritance chain', () => {
      const errors = [
        new ValidationError([]),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new ExternalServiceError('Service', 'Error'),
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
      });
    });

    it('should allow type discrimination', () => {
      const error: AppError = new ValidationError([{ field: 'test', message: 'error' }]);

      if (error instanceof ValidationError) {
        expect(error.errors).toBeDefined();
      }
    });

    it('should maintain unique types', () => {
      const validation = new ValidationError([]);
      const unauthorized = new UnauthorizedError();
      const notFound = new NotFoundError();

      expect(validation instanceof ValidationError).toBe(true);
      expect(validation instanceof UnauthorizedError).toBe(false);
      expect(validation instanceof NotFoundError).toBe(false);

      expect(unauthorized instanceof UnauthorizedError).toBe(true);
      expect(unauthorized instanceof ValidationError).toBe(false);
      expect(unauthorized instanceof NotFoundError).toBe(false);

      expect(notFound instanceof NotFoundError).toBe(true);
      expect(notFound instanceof ValidationError).toBe(false);
      expect(notFound instanceof UnauthorizedError).toBe(false);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should be catchable in try-catch blocks', () => {
      const testError = () => {
        throw new NotFoundError('Test resource not found');
      };

      expect(testError).toThrow(NotFoundError);
      expect(testError).toThrow('Test resource not found');
    });

    it('should preserve error information when caught', () => {
      try {
        throw new ValidationError([{ field: 'email', message: 'Invalid' }], 'Validation failed');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.statusCode).toBe(400);
          expect(error.errors).toHaveLength(1);
          expect(error.message).toBe('Validation failed');
        }
      }
    });

    it('should work with async error handling', async () => {
      const asyncFunction = async () => {
        throw new UnauthorizedError('Token expired');
      };

      await expect(asyncFunction()).rejects.toThrow(UnauthorizedError);
      await expect(asyncFunction()).rejects.toThrow('Token expired');
    });

    it('should maintain stack trace through error chain', () => {
      const error = new AppError(500, 'Test error');
      const stack = error.stack;

      expect(stack).toBeDefined();
      expect(stack).toContain('errors.util.test.ts');
    });
  });

  describe('Error Properties', () => {
    it('should have correct HTTP status codes', () => {
      const errorStatusMap = [
        { error: new ValidationError([]), status: 400 },
        { error: new UnauthorizedError(), status: 401 },
        { error: new ForbiddenError(), status: 403 },
        { error: new NotFoundError(), status: 404 },
        { error: new ConflictError(), status: 409 },
        { error: new AppError(500, 'Error'), status: 500 },
        { error: new ExternalServiceError('Service', 'Error'), status: 503 },
      ];

      errorStatusMap.forEach(({ error, status }) => {
        expect(error.statusCode).toBe(status);
      });
    });

    it('should all be operational errors by default', () => {
      const errors = [
        new ValidationError([]),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new ExternalServiceError('Service', 'Error'),
      ];

      errors.forEach(error => {
        expect(error.isOperational).toBe(true);
      });
    });

    it('should have descriptive default messages', () => {
      expect(new ValidationError([]).message).toBe('Validation failed');
      expect(new UnauthorizedError().message).toBe('Unauthorized');
      expect(new ForbiddenError().message).toBe('Forbidden');
      expect(new NotFoundError().message).toBe('Resource not found');
      expect(new ConflictError().message).toBe('Resource conflict');
    });
  });
});
