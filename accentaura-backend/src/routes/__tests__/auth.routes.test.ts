import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../auth.routes';
import { errorMiddleware } from '../../middlewares/error.middleware';

// Mock the auth service
jest.mock('../../services/auth.service', () => ({
  authService: {
    signup: jest.fn(),
    login: jest.fn(),
    loginWithOAuth: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
  },
}));

// Mock the database
jest.mock('../../config/db', () => ({
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock logger with all methods
jest.mock('../../config/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
  },
}));

// Mock JWT utilities
jest.mock('../../utils/jwt.util', () => ({
  verifyToken: jest.fn(),
}));

describe('Auth Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid signup data', async () => {
      const { authService } = require('../../services/auth.service');
      authService.signup.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        progress: {},
      });

      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(authService.signup).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid login data', async () => {
      const { authService } = require('../../services/auth.service');
      authService.login.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        progress: {},
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  describe('POST /auth/oauth', () => {
    it('should validate provider enum', async () => {
      const response = await request(app)
        .post('/auth/oauth')
        .send({
          provider: 'invalid-provider',
          token: 'oauth-token',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require token', async () => {
      const response = await request(app)
        .post('/auth/oauth')
        .send({
          provider: 'google',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid OAuth data for Google', async () => {
      const { authService } = require('../../services/auth.service');
      authService.loginWithOAuth.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        progress: {},
      });

      const response = await request(app)
        .post('/auth/oauth')
        .send({
          provider: 'google',
          token: 'google-oauth-token',
        });

      expect(response.status).toBe(200);
      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'google',
        'google-oauth-token'
      );
    });

    it('should accept valid OAuth data for Facebook', async () => {
      const { authService } = require('../../services/auth.service');
      authService.loginWithOAuth.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' },
        progress: {},
      });

      const response = await request(app)
        .post('/auth/oauth')
        .send({
          provider: 'facebook',
          token: 'facebook-oauth-token',
        });

      expect(response.status).toBe(200);
      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'facebook',
        'facebook-oauth-token'
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid refresh token', async () => {
      const { authService } = require('../../services/auth.service');
      authService.refreshToken.mockResolvedValue({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(200);
      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('POST /auth/validate', () => {
    it('should require token', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate token', async () => {
      const { authService } = require('../../services/auth.service');
      authService.validateToken.mockResolvedValue({
        valid: true,
      });

      const response = await request(app)
        .post('/auth/validate')
        .send({
          token: 'valid-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should logout successfully', async () => {
      const { authService } = require('../../services/auth.service');
      authService.logout.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.logout).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('GET /auth/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should return user profile when authenticated', async () => {
      const prisma = require('../../config/db').default;
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        provider: 'EMAIL',
        currentLevel: 1,
        totalXp: 0,
        streak: 0,
        coins: 0,
        lastActivityDate: null,
      });

      // Create a mock token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: '1', email: 'test@example.com' },
        'test-secret'
      );

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.progress).toBeDefined();
    });
  });
});
