import { Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../auth.middleware';
import { generateAccessToken } from '../../utils/jwt.util';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// Mock logger to avoid console output during tests
jest.mock('../../config/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/test',
      method: 'GET',
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid token and attach user to request', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = generateAccessToken(userId, email);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(userId);
      expect(mockRequest.user?.email).toBe(email);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request with no authorization header', async () => {
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No authorization header provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with invalid authorization header format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          statusCode: 401,
        })
      );
    });

    it('should reject request with empty token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with whitespace-only token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer    ',
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should reject request with malformed token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer notajwttoken',
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should handle expired token', async () => {
      // Create a token that's already expired (using jwt directly with negative expiry)
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        env.JWT_SECRET,
        { expiresIn: '-1s', algorithm: 'HS256' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token has expired',
          statusCode: 401,
        })
      );
    });

    it('should extract token correctly with extra spaces', async () => {
      const userId = 'user-456';
      const email = 'user@test.com';
      const token = generateAccessToken(userId, email);

      mockRequest.headers = {
        authorization: `Bearer  ${token}  `,
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Should still work after trimming
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(userId);
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should authenticate valid token and attach user to request', async () => {
      const userId = 'user-789';
      const email = 'optional@example.com';
      const token = generateAccessToken(userId, email);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(userId);
      expect(mockRequest.user?.email).toBe(email);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when no authorization header', async () => {
      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid header format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when empty token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when expired token', async () => {
      // Create a token that's already expired
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        env.JWT_SECRET,
        { expiresIn: '-1s', algorithm: 'HS256' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      await optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Token Payload Structure', () => {
    it('should include all required fields in token payload', async () => {
      const userId = 'user-payload-test';
      const email = 'payload@test.com';
      const token = generateAccessToken(userId, email);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toMatchObject({
        userId,
        email,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    it('should have exp greater than iat', async () => {
      const token = generateAccessToken('user-123', 'test@example.com');

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user?.exp).toBeGreaterThan(mockRequest.user?.iat || 0);
    });
  });
});
