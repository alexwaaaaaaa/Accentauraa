import { Router } from 'express';
import { z } from 'zod';
import * as leaderboardController from '../controllers/leaderboard.controller';
import { validateQuery, validateParams } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Validation Schemas
 */

// Get leaderboard query validation schema
const getLeaderboardQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 1000, {
      message: 'Limit must be between 1 and 1000',
    }),
});

// Get user rank params validation schema
const getUserRankParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * Leaderboard Routes
 * All routes are prefixed with /leaderboard
 * Mobile app expects /v1/leaderboard/* paths
 */

/**
 * GET /leaderboard?limit=100
 * Get leaderboard data
 * Mobile app path: /v1/leaderboard?limit=100
 * Requires authentication
 * 
 * Query params: { limit?: number } (default: 100, max: 1000)
 * Response: { entries: [{ userId, username, avatarUrl, totalXp, rank, streak }], lastUpdated }
 */
router.get(
  '/',
  authMiddleware as any,
  validateQuery(getLeaderboardQuerySchema),
  leaderboardController.getLeaderboard
);

/**
 * GET /leaderboard/rank/:userId
 * Get user's rank and percentile
 * Mobile app path: /v1/leaderboard/rank/:userId
 * Requires authentication
 * 
 * Path params: { userId: string }
 * Response: { rank: number, totalUsers: number, percentile: number }
 */
router.get(
  '/rank/:userId',
  authMiddleware as any,
  validateParams(getUserRankParamsSchema),
  leaderboardController.getUserRank
);

export default router;
