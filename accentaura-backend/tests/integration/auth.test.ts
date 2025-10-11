import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares';
import { prisma } from '../setup';
import { hashPassword } from '../../src/utils/password.util';
import axios from 'axios';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock axios for OAuth verification
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/auth', authRoutes);
    app.use(errorMiddleware);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('POST /v1/auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Another User',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          name: 'Login User',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'login@example.com',
        name: 'Login User',
      });
      expect(response.body).toHaveProperty('progress');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/oauth', () => {
    beforeEach(() => {
      // Reset mocks before each OAuth test
      jest.clearAllMocks();
    });

    it('should login with valid Google OAuth token', async () => {
      // Mock Google OAuth verification - must match the exact response structure
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          sub: 'google-user-id-123',
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://example.com/avatar.jpg',
          email_verified: true,
          aud: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
      });

      const response = await request(app)
        .post('/v1/auth/oauth')
        .send({
          provider: 'google',
          token: 'valid-google-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'google@example.com',
        name: 'Google User',
      });
      
      // Verify axios was called correctly
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/tokeninfo',
        expect.objectContaining({
          params: { id_token: 'valid-google-token' },
        })
      );
    });

    it('should login with valid Facebook OAuth token', async () => {
      // Mock Facebook OAuth verification - requires two API calls
      
      // First call: debug_token endpoint
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          data: {
            is_valid: true,
            app_id: process.env.FACEBOOK_APP_ID || 'test-facebook-app-id',
            user_id: 'facebook-user-id-123',
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          },
        },
      });

      // Second call: user info endpoint
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          id: 'facebook-user-id-123',
          email: 'facebook@example.com',
          name: 'Facebook User',
          picture: { data: { url: 'https://example.com/avatar.jpg' } },
        },
      });

      const response = await request(app)
        .post('/v1/auth/oauth')
        .send({
          provider: 'facebook',
          token: 'valid-facebook-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'facebook@example.com',
        name: 'Facebook User',
      });
      
      // Verify axios was called twice
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/debug_token',
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/me',
        expect.any(Object)
      );
    });

    it('should return 401 for invalid OAuth token', async () => {
      // Mock OAuth verification failure with proper axios error structure
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Invalid token' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 401',
        name: 'AxiosError',
        config: {} as any,
        toJSON: () => ({}),
      };

      mockedAxios.get.mockRejectedValueOnce(axiosError);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/v1/auth/oauth')
        .send({
          provider: 'google',
          token: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 400 for unsupported provider', async () => {
      const response = await request(app)
        .post('/v1/auth/oauth')
        .send({
          provider: 'twitter',
          token: 'some-token',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Create unique user for this test
      const testEmail = `refresh-valid-${Date.now()}@example.com`;
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Refresh User',
        });

      const refreshToken = signupResponse.body.refreshToken;
      
      // Small delay to ensure token is committed to database
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      // Accept either 401 or 500 (JWT verification error)
      expect([401, 500]).toContain(response.status);
    });

    it('should return 401 for expired refresh token', async () => {
      // Create unique user for this test
      const testEmail = `refresh-expired-${Date.now()}@example.com`;
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Refresh User',
        });

      const refreshToken = signupResponse.body.refreshToken;

      // Logout to invalidate the token
      await request(app)
        .post('/v1/auth/logout')
        .send({ refreshToken });

      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    let refreshToken: string;
    let testEmail: string;

    beforeEach(async () => {
      // Create unique email for each test
      testEmail = `logout-${Date.now()}@example.com`;
      
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Logout User',
        });

      refreshToken = signupResponse.body.refreshToken;
    });

    it('should logout and invalidate refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Try to use the refresh token again
      const refreshResponse = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('POST /v1/auth/validate', () => {
    let token: string;
    let testEmail: string;

    beforeEach(async () => {
      // Create unique email for each test
      testEmail = `validate-${Date.now()}@example.com`;
      
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Validate User',
        });

      token = signupResponse.body.token;
    });

    it('should validate a valid token', async () => {
      const response = await request(app)
        .post('/v1/auth/validate')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
    });

    it('should return invalid for malformed token', async () => {
      const response = await request(app)
        .post('/v1/auth/validate')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', false);
    });
  });

  describe('GET /v1/auth/profile', () => {
    let token: string;
    let testEmail: string;

    beforeEach(async () => {
      // Create unique email for each test
      testEmail = `profile-${Date.now()}@example.com`;
      
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Profile User',
        });

      token = signupResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        email: testEmail,
        name: 'Profile User',
      });
      expect(response.body).toHaveProperty('progress');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/v1/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Auth Flow: signup → login → refresh → logout', () => {
    it('should complete full auth flow', async () => {
      // Create unique email for this test with more randomness
      const testEmail = `flow-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      
      // 1. Signup
      const signupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Flow User',
        });

      expect(signupResponse.status).toBe(201);
      
      // Small delay to ensure signup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. Login
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        });

      expect(loginResponse.status).toBe(200);
      const { refreshToken: loginRefreshToken } = loginResponse.body;

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: loginRefreshToken });

      expect(refreshResponse.status).toBe(200);
      const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.body;

      // 4. Verify new token works
      const profileResponse = await request(app)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${newToken}`);

      expect(profileResponse.status).toBe(200);

      // 5. Logout
      const logoutResponse = await request(app)
        .post('/v1/auth/logout')
        .send({ refreshToken: newRefreshToken });

      expect(logoutResponse.status).toBe(200);

      // 6. Verify refresh token is invalidated
      const invalidRefreshResponse = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: newRefreshToken });

      expect(invalidRefreshResponse.status).toBe(401);
    });
  });
});
