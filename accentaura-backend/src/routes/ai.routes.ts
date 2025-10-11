import { Router } from 'express';
import { z } from 'zod';
import * as aiController from '../controllers/ai.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadSingleAudio } from '../middlewares/upload.middleware';
import interviewRoutes from './interview.routes';

const router = Router();

/**
 * Validation Schemas
 */

// Chat validation schema
const chatSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000, 'Prompt is too long'),
  conversationId: z.string().optional(),
});

// Confidence score validation schema
const confidenceScoreSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text is too long'),
});

/**
 * AI Routes
 * All routes are prefixed with /ai
 * Mobile app expects /v1/ai/* paths
 * All routes require authentication
 */

/**
 * POST /ai/chat
 * Chat with AI assistant
 * Mobile app path: /v1/ai/chat
 * 
 * Request body: { prompt: string, conversationId?: string }
 * Response: { message: string, audioUrl?: string }
 */
router.post(
  '/chat',
  authMiddleware as any,
  validateBody(chatSchema),
  aiController.chat
);

/**
 * POST /ai/analyze-speech
 * Analyze speech from audio file
 * Mobile app path: /v1/ai/analyze-speech
 * 
 * Request: multipart/form-data with audio file
 * Response: { score: number, feedback: string, details?: object }
 */
router.post(
  '/analyze-speech',
  authMiddleware as any,
  uploadSingleAudio,
  aiController.speechAnalyze
);

/**
 * POST /ai/confidence-score
 * Analyze text for confidence level
 * For future use - not currently used by mobile app
 * 
 * Request body: { text: string }
 * Response: { confidence: number, suggestions: string[] }
 */
router.post(
  '/confidence-score',
  authMiddleware as any,
  validateBody(confidenceScoreSchema),
  aiController.confidenceScore
);

/**
 * Interview Routes
 * All interview routes are prefixed with /ai/interview
 * Mobile app expects /v1/ai/interview/* paths
 */
router.use('/interview', interviewRoutes);

export default router;
