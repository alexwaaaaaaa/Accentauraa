import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Validation Schemas
 */

// Signup validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

// Login validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// OAuth validation schema
const oauthSchema = z.object({
  provider: z.enum(['google', 'facebook'], {
    errorMap: () => ({ message: 'Provider must be either google or facebook' }),
  }),
  token: z.string().min(1, 'OAuth token is required'),
});

// Refresh token validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Logout validation schema
const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Validate token schema
const validateSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Auth Routes
 * All routes are prefixed with /auth
 * Mobile app expects /v1/auth/* paths
 */

/**
 * POST /auth/signup
 * Register a new user with email and password
 * Not used by mobile app yet, but part of design
 * 
 * Request body: { email: string, password: string, name?: string }
 * Response: { token, refreshToken, user, progress }
 */
router.post('/signup', validateBody(signupSchema), authController.signup);

/**
 * POST /auth/login
 * Login with email and password
 * Mobile app path: /v1/auth/login
 * 
 * Request body: { email: string, password: string }
 * Response: { token, refreshToken, user, progress }
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * POST /auth/oauth
 * Login with OAuth provider (Google or Facebook)
 * Mobile app path: /v1/auth/oauth
 * 
 * Request body: { provider: 'google' | 'facebook', token: string }
 * Response: { token, refreshToken, user, progress }
 */
router.post('/oauth', validateBody(oauthSchema), authController.oauth);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Mobile app path: /v1/auth/refresh
 * 
 * Request body: { refreshToken: string }
 * Response: { token, refreshToken }
 */
router.post('/refresh', validateBody(refreshSchema), authController.refresh);

/**
 * POST /auth/validate
 * Validate a JWT token
 * Mobile app path: /v1/auth/validate
 * 
 * Request body: { token: string }
 * Response: { valid: boolean }
 */
router.post('/validate', validateBody(validateSchema), authController.validate);

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 * Not used by mobile app yet
 * 
 * Request body: { refreshToken: string }
 * Response: { success: true }
 */
router.post('/logout', validateBody(logoutSchema), authController.logout);

/**
 * GET /auth/profile
 * Get authenticated user's profile and progress
 * Not used by mobile app yet
 * Requires authentication
 * 
 * Headers: Authorization: Bearer <token>
 * Response: { user, progress }
 */
router.get('/profile', authMiddleware as any, authController.profile);

export default router;
