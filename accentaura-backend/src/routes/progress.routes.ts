import { Router } from 'express';
import { z } from 'zod';
import * as progressController from '../controllers/progress.controller';
import { validateParams, validateBody } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Validation Schemas
 */

// Get user progress params validation schema
const getUserProgressParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Save progress validation schema
const saveProgressSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID format'),
  completed: z.boolean(),
  score: z.number().min(0, 'Score must be at least 0').max(1, 'Score must be at most 1'),
  timeTaken: z.number().min(0, 'Time taken must be a positive number').optional(),
  timestamp: z.string().datetime().optional(),
});

// Sync progress validation schema
const syncProgressSchema = z.object({
  updates: z.array(
    z.object({
      lessonId: z.string().uuid('Invalid lesson ID format'),
      completed: z.boolean(),
      score: z.number().min(0, 'Score must be at least 0').max(1, 'Score must be at most 1'),
      timeTaken: z.number().min(0, 'Time taken must be a positive number').optional(),
      timestamp: z.string().datetime().optional(),
    })
  ).min(1, 'At least one update is required'),
});

// Award XP validation schema
const awardXPSchema = z.object({
  amount: z.number().min(1, 'XP amount must be at least 1'),
  source: z.string().min(1, 'Source is required'),
});

/**
 * Progress Routes
 * All routes are prefixed with /progress
 * Mobile app expects /v1/progress/* paths
 */

/**
 * GET /progress/:userId
 * Get user progress data
 * Mobile app path: /v1/progress/:userId
 * Requires authentication
 * 
 * Path params: { userId: string }
 * Response: { currentLevel, totalXp, streak, coins, lastActivityDate, badges, lessonProgress }
 */
router.get(
  '/:userId',
  authMiddleware as any,
  validateParams(getUserProgressParamsSchema),
  progressController.getUserProgress
);

/**
 * POST /progress
 * Save single progress update
 * Mobile app path: /v1/progress
 * Requires authentication
 * 
 * Request body: { lessonId: string, completed: boolean, score: number, timeTaken?: number, timestamp?: string }
 * Response: { synced: number, failed: number, progress: UserProgress }
 */
router.post(
  '/',
  authMiddleware as any,
  validateBody(saveProgressSchema),
  progressController.saveProgress
);

/**
 * POST /progress/sync
 * Batch sync progress updates
 * For future use - mobile app sends array of ProgressUpdate
 * Requires authentication
 * 
 * Request body: { updates: ProgressUpdate[] }
 * Response: { synced: number, failed: number, progress: UserProgress }
 */
router.post(
  '/sync',
  authMiddleware as any,
  validateBody(syncProgressSchema),
  progressController.syncProgress
);

/**
 * POST /progress/xp
 * Manually award XP to user
 * For future use
 * Requires authentication
 * 
 * Request body: { amount: number, source: string }
 * Response: { totalXp: number, currentLevel: number, leveledUp: boolean, previousLevel?: number }
 */
router.post(
  '/xp',
  authMiddleware as any,
  validateBody(awardXPSchema),
  progressController.awardXP
);

/**
 * POST /progress/streak
 * Update user streak
 * For future use
 * Requires authentication
 * 
 * Response: { streak: number, lastActivityDate: Date, streakBroken: boolean }
 */
router.post(
  '/streak',
  authMiddleware as any,
  progressController.updateStreak
);

export default router;
