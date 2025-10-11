import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response.util';
import logger from '../config/logger';

/**
 * Auth Controller
 * Handles all authentication-related HTTP requests
 */

/**
 * Signup Handler
 * POST /auth/signup
 * Not used by mobile app yet, but part of design
 * 
 * Request body: { email: string, password: string, name?: string }
 * Response: { token, refreshToken, user, progress }
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;

    logger.info(`Signup attempt for email: ${email}`);

    const result = await authService.signup(email, password, name);

    logger.info(`Signup successful for user: ${result.user.id}`);

    // Mobile app expects direct response
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Login Handler
 * POST /auth/login
 * Mobile app expects email/password
 * 
 * Request body: { email: string, password: string }
 * Response: { token, refreshToken, user, progress }
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    const result = await authService.login(email, password);

    logger.info(`Login successful for user: ${result.user.id}`);

    // Mobile app expects direct response with token, refreshToken, user, progress
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * OAuth Login Handler
 * POST /auth/oauth
 * Mobile app expects provider/token
 * 
 * Request body: { provider: string, token: string }
 * Response: { token, refreshToken, user, progress }
 */
export async function oauth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { provider, token } = req.body;

    logger.info(`OAuth login attempt with provider: ${provider}`);

    const result = await authService.loginWithOAuth(provider, token);

    logger.info(`OAuth login successful for user: ${result.user.id}`);

    // Mobile app expects direct response with token, refreshToken, user, progress
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh Token Handler
 * POST /auth/refresh
 * Mobile app expects refreshToken
 * 
 * Request body: { refreshToken: string }
 * Response: { token, refreshToken }
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    logger.info('Token refresh attempt');

    const result = await authService.refreshToken(refreshToken);

    logger.info('Token refresh successful');

    // Mobile app expects direct response with token, refreshToken
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Logout Handler
 * POST /auth/logout
 * Not used by mobile app yet
 * 
 * Request body: { refreshToken: string }
 * Response: { success: true }
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    logger.info('Logout attempt');

    await authService.logout(refreshToken);

    logger.info('Logout successful');

    sendSuccess(res, { success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Profile Handler
 * GET /auth/profile
 * Not used by mobile app yet
 * Requires authentication middleware
 * 
 * Response: { user, progress }
 */
export async function profile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    logger.info(`Profile request for user: ${userId}`);

    // Fetch user data from database
    const prisma = (await import('../config/db')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return user and progress data
    const response = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        currentLevel: user.currentLevel,
        totalXp: user.totalXp,
        streak: user.streak,
        coins: user.coins,
      },
      progress: {
        currentLevel: user.currentLevel,
        totalXp: user.totalXp,
        streak: user.streak,
        coins: user.coins,
        lastActivityDate: user.lastActivityDate,
      },
    };

    logger.info(`Profile retrieved for user: ${userId}`);

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
}

/**
 * Validate Token Handler
 * POST /auth/validate
 * Mobile app expects token validation
 * 
 * Request body: { token: string }
 * Response: { valid: boolean }
 */
export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body;

    logger.info('Token validation attempt');

    const result = await authService.validateToken(token);

    logger.info(`Token validation result: ${result.valid}`);

    // Mobile app expects { valid: boolean }
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
