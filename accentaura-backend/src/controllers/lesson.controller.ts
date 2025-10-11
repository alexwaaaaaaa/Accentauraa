import { Request, Response, NextFunction } from 'express';
import { lessonService } from '../services/lesson.service';
import { sendSuccess } from '../utils/response.util';
import logger from '../config/logger';
import { ValidationError, UnauthorizedError } from '../utils/errors.util';

/**
 * Lesson Controller
 * Handles all lesson-related HTTP requests
 */

/**
 * Get Lessons Handler
 * GET /lessons?from=X&to=Y
 * Mobile app expects 'from' and 'to' query params
 * 
 * Query params: { from: number, to: number }
 * Response: { lessons: [{ id, level, title, type, xpReward, isLocked, isCompleted }] }
 */
export async function getLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User ID not found in request');
    }

    // Parse query parameters
    const from = parseInt(req.query.from as string, 10);
    const to = parseInt(req.query.to as string, 10);

    // Validate query parameters
    if (isNaN(from) || isNaN(to)) {
      throw new ValidationError([{ field: 'query', message: 'from and to must be numbers' }], 'Invalid query parameters');
    }

    if (from < 1 || to < 1) {
      throw new ValidationError([{ field: 'query', message: 'from and to must be greater than 0' }], 'Invalid query parameters');
    }

    if (from > to) {
      throw new ValidationError([{ field: 'query', message: 'from must be less than or equal to to' }], 'Invalid query parameters');
    }

    logger.info(`Get lessons request for user ${userId}: from=${from}, to=${to}`);

    const lessons = await lessonService.getLessons(from, to, userId);

    logger.info(`Retrieved ${lessons.length} lessons for user ${userId}`);

    // Mobile app expects direct response with lessons array
    sendSuccess(res, { lessons });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Lesson Handler
 * GET /lessons/:level
 * Mobile app expects level as path param
 * 
 * Path params: { level: number }
 * Response: { id, level, title, type, xpReward, activities, mediaUrls, isLocked, isCompleted }
 */
export async function getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User ID not found in request');
    }

    // Get level from path params
    const level = req.params.level;

    if (!level) {
      throw new ValidationError([{ field: 'level', message: 'Lesson level is required' }], 'Invalid request');
    }

    logger.info(`Get lesson request for user ${userId}: level=${level}`);

    // lessonService.getLesson accepts either ID or level number
    const lesson = await lessonService.getLesson(level, userId);

    logger.info(`Retrieved lesson ${lesson.id} (level ${lesson.level}) for user ${userId}`);

    // Mobile app expects direct lesson object
    sendSuccess(res, lesson);
  } catch (error) {
    next(error);
  }
}

/**
 * Complete Lesson Handler
 * POST /lessons/complete
 * Not used by mobile app yet
 * 
 * Request body: { lessonId: string, score: number, timeTaken: number }
 * Response: { xpEarned, totalXp, newLevel, leveledUp, progress }
 */
export async function completeLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User ID not found in request');
    }

    const { lessonId, score, timeTaken } = req.body;

    // Validate request body
    const errors: any[] = [];
    
    if (!lessonId) {
      errors.push({ field: 'lessonId', message: 'Lesson ID is required' });
    }

    if (typeof score !== 'number' || score < 0 || score > 1) {
      errors.push({ field: 'score', message: 'Score must be a number between 0 and 1' });
    }

    if (typeof timeTaken !== 'number' || timeTaken < 0) {
      errors.push({ field: 'timeTaken', message: 'Time taken must be a positive number' });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors, 'Invalid request body');
    }

    logger.info(`Complete lesson request for user ${userId}: lessonId=${lessonId}, score=${score}, timeTaken=${timeTaken}`);

    const result = await lessonService.completeLesson(userId, lessonId, score, timeTaken);

    logger.info(`Lesson ${lessonId} completed by user ${userId}: earned ${result.xpEarned} XP${result.leveledUp ? ', leveled up!' : ''}`);

    // Return completion result
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
