import { AuthService } from '../auth.service';
import prisma from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../utils/jwt.util';
import { UnauthorizedError, ConflictError } from '../../utils/errors.util';
import { AuthProvider } from '@prisma/client';
import axios from 'axios';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../utils/password.util');
jest.mock('../../utils/jwt.util');
jest.mock('axios');
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    FACEBOOK_APP_ID: 'test-facebook-app-id',
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    avatarUrl: null,
    provider: AuthProvider.EMAIL,
    currentLevel: 1,
    totalXp: 0,
    streak: 0,
    coins: 0,
    lastActivityDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.signup('test@example.com', 'password123', 'Test User');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          name: 'Test User',
          provider: AuthProvider.EMAIL,
        },
      });
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw ConflictError if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.signup('test@example.com', 'password123')
      ).rejects.toThrow(ConflictError);
    });

    it('should create user without name if not provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      await authService.signup('test@example.com', 'password123');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          name: undefined,
          provider: AuthProvider.EMAIL,
        },
      });
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login('test@example.com', 'password123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.progress).toBeDefined();
    });

    it('should throw UnauthorizedError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrong-password')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if user has no password (OAuth user)', async () => {
      const oauthUser = { ...mockUser, password: null };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(oauthUser);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('loginWithOAuth', () => {
    const mockOAuthUserInfo = {
      email: 'oauth@example.com',
      name: 'OAuth User',
      avatarUrl: 'https://example.com/avatar.jpg',
      providerId: 'oauth-provider-id',
    };

    it('should create new user for first-time OAuth login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: mockOAuthUserInfo.email,
        provider: AuthProvider.GOOGLE,
      });
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      // Mock Google token verification
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          email: mockOAuthUserInfo.email,
          name: mockOAuthUserInfo.name,
          picture: mockOAuthUserInfo.avatarUrl,
          sub: mockOAuthUserInfo.providerId,
          aud: 'test-google-client-id',
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      const result = await authService.loginWithOAuth('google', 'valid-oauth-token');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockOAuthUserInfo.email,
          name: mockOAuthUserInfo.name,
          avatarUrl: mockOAuthUserInfo.avatarUrl,
          provider: AuthProvider.GOOGLE,
          password: null,
        },
      });
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should update existing user for returning OAuth login', async () => {
      const existingUser = { ...mockUser, provider: AuthProvider.EMAIL };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        provider: AuthProvider.GOOGLE,
      });
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      // Mock Google token verification
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          email: mockUser.email,
          name: mockUser.name,
          picture: null,
          sub: 'provider-id',
          aud: 'test-google-client-id',
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      const result = await authService.loginWithOAuth('google', 'valid-oauth-token');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should handle Facebook OAuth login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        provider: AuthProvider.FACEBOOK,
      });
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      // Mock Facebook token verification
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            data: {
              is_valid: true,
              app_id: 'test-facebook-app-id',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'facebook-id',
            email: mockUser.email,
            name: mockUser.name,
            picture: { data: { url: 'https://example.com/avatar.jpg' } },
          },
        });

      const result = await authService.loginWithOAuth('facebook', 'valid-facebook-token');

      expect(result.token).toBe('access-token');
      expect(result.user.provider).toBe(AuthProvider.FACEBOOK);
    });

    it('should throw UnauthorizedError for unsupported provider', async () => {
      await expect(
        authService.loginWithOAuth('twitter', 'token')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = {
      id: 'token-id',
      userId: mockUser.id,
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    it('should generate new tokens with valid refresh token', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('new-access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('new-refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      const result = await authService.refreshToken('valid-refresh-token');

      expect(verifyToken).toHaveBeenCalledWith('valid-refresh-token', true);
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedError if refresh token not found in database', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if refresh token is expired', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(expiredToken);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(
        authService.refreshToken('expired-token')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if user not found', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.refreshToken('valid-refresh-token')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should delete refresh token on logout', async () => {
      const mockRefreshToken = {
        id: 'token-id',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await authService.logout('refresh-token');

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'refresh-token' },
      });
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-id' },
      });
    });

    it('should not throw error if token not found', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.logout('non-existent-token')).resolves.not.toThrow();
    });
  });

  describe('validateToken', () => {
    it('should return valid true for valid token and existing user', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.validateToken('valid-token');

      expect(result.valid).toBe(true);
    });

    it('should return valid false if user not found', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateToken('valid-token');

      expect(result.valid).toBe(false);
    });

    it('should return valid false if token verification fails', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
    });
  });
});
