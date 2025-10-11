import { Router } from 'express';
import { z } from 'zod';
import * as lessonController from '../controllers/lesson.controller';
import { validateQuery, validateParams, validateBody } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Validation Schemas
 */

// Get lessons query validation schema
const getLessonsQuerySchema = z.object({
  from: z.string().regex(/^\d+$/, 'from must be a number').transform(Number),
  to: z.string().regex(/^\d+$/, 'to must be a number').transform(Number),
}).refine((data) => data.from >= 1 && data.to >= 1, {
  message: 'from and to must be greater than 0',
}).refine((data) => data.from <= data.to, {
  message: 'from must be less than or equal to to',
});

// Get lesson by level params validation schema
const getLessonParamsSchema = z.object({
  level: z.string().regex(/^\d+$/, 'level must be a number'),
});

// Complete lesson validation schema
const completeLessonSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID format'),
  score: z.number().min(0, 'Score must be at least 0').max(1, 'Score must be at most 1'),
  timeTaken: z.number().min(0, 'Time taken must be a positive number'),
});

/**
 * Lesson Routes
 * All routes are prefixed with /lessons
 * Mobile app expects /v1/lessons/* paths
 */

/**
 * GET /lessons?from=X&to=Y
 * Get lessons with pagination
 * Mobile app path: /v1/lessons?from=X&to=Y
 * Requires authentication
 * 
 * Query params: { from: number, to: number }
 * Response: { lessons: [{ id, level, title, type, xpReward, isLocked, isCompleted }] }
 */
router.get(
  '/',
  authMiddleware as any,
  validateQuery(getLessonsQuerySchema),
  lessonController.getLessons
);

/**
 * GET /lessons/:level
 * Get a specific lesson by level
 * Mobile app path: /v1/lessons/:level
 * Requires authentication
 * 
 * Path params: { level: number }
 * Response: { id, level, title, type, xpReward, activities, mediaUrls, isLocked, isCompleted }
 */
router.get(
  '/:level',
  authMiddleware as any,
  validateParams(getLessonParamsSchema),
  lessonController.getLesson
);

/**
 * POST /lessons/complete
 * Mark a lesson as complete and calculate XP
 * Not used by mobile app yet, but part of design
 * Requires authentication
 * 
 * Request body: { lessonId: string, score: number, timeTaken: number }
 * Response: { xpEarned, totalXp, newLevel, leveledUp, progress }
 */
router.post(
  '/complete',
  authMiddleware as any,
  validateBody(completeLessonSchema),
  lessonController.completeLesson
);

export default router;
