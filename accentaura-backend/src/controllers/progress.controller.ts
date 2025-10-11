import { Request, Response, NextFunction } from 'express';
import { progressService, ProgressUpdate } from '../services/progress.service';
import { sendSuccess } from '../utils/response.util';
import logger from '../config/logger';

/**
 * Progress Controller
 * Handles all progress-related HTTP requests
 */

/**
 * Get User Progress Handler
 * GET /progress/:userId
 * Mobile app expects complete progress data
 * 
 * Response: { currentLevel, totalXp, streak, coins, lastActivityDate, badges, lessonProgress }
 */
export async function getUserProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    logger.info(`Get progress request for user: ${userId}`);

    const progress = await progressService.getUserProgress(userId);

    logger.info(`Progress retrieved for user: ${userId}`);

    // Mobile app expects direct progress data
    sendSuccess(res, progress);
  } catch (error) {
    next(error);
  }
}

/**
 * Save Progress Handler
 * POST /progress
 * Mobile app sends single ProgressUpdate
 * 
 * Request body: { lessonId: string, completed: boolean, score: number, timeTaken?: number, timestamp: Date }
 * Response: { synced: number, failed: number, progress: UserProgress }
 */
export async function saveProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const progressUpdate: ProgressUpdate = {
      lessonId: req.body.lessonId,
      completed: req.body.completed,
      score: req.body.score,
      timeTaken: req.body.timeTaken,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
    };

    logger.info(`Save progress request for user: ${userId}, lesson: ${progressUpdate.lessonId}`);

    // Use syncProgress with single update
    const result = await progressService.syncProgress(userId, [progressUpdate]);

    logger.info(
      `Progress saved for user: ${userId}, synced: ${result.synced}, failed: ${result.failed}`
    );

    // Mobile app expects sync result with updated progress
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Sync Progress Handler
 * POST /progress/sync
 * For future batch sync - mobile app sends array of ProgressUpdate
 * 
 * Request body: { updates: ProgressUpdate[] }
 * Response: { synced: number, failed: number, progress: UserProgress }
 */
export async function syncProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const updates: ProgressUpdate[] = req.body.updates || [];

    // Convert timestamp strings to Date objects
    const processedUpdates = updates.map(update => ({
      ...update,
      timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
    }));

    logger.info(`Sync progress request for user: ${userId}, updates: ${updates.length}`);

    const result = await progressService.syncProgress(userId, processedUpdates);

    logger.info(
      `Progress synced for user: ${userId}, synced: ${result.synced}, failed: ${result.failed}`
    );

    // Return sync result with updated progress
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Award XP Handler
 * POST /progress/xp
 * For future use - manually award XP to user
 * 
 * Request body: { amount: number, source: string }
 * Response: { totalXp: number, currentLevel: number, leveledUp: boolean, previousLevel?: number }
 */
export async function awardXP(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const { amount, source } = req.body;

    logger.info(`Award XP request for user: ${userId}, amount: ${amount}, source: ${source}`);

    const result = await progressService.awardXP(userId, amount, source);

    logger.info(
      `XP awarded to user: ${userId}, total: ${result.totalXp}, level: ${result.currentLevel}${
        result.leveledUp ? ' (leveled up!)' : ''
      }`
    );

    // Return XP result
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Update Streak Handler
 * POST /progress/streak
 * For future use - manually update user streak
 * 
 * Response: { streak: number, lastActivityDate: Date, streakBroken: boolean }
 */
export async function updateStreak(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    logger.info(`Update streak request for user: ${userId}`);

    const result = await progressService.updateStreak(userId);

    logger.info(
      `Streak updated for user: ${userId}, streak: ${result.streak}${
        result.streakBroken ? ' (streak broken)' : ''
      }`
    );

    // Return streak result
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
