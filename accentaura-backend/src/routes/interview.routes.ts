import { Router } from 'express';
import { z } from 'zod';
import * as interviewController from '../controllers/interview.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadInterviewFiles } from '../middlewares/upload.middleware';

const router = Router();

/**
 * Validation Schemas
 */

// Start interview validation schema
const startInterviewSchema = z.object({
  interviewType: z.string().min(1, 'Interview type is required'),
});

// Submit interview validation schema (for body fields, files handled by multer)
const submitInterviewSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Interview Routes
 * All routes are prefixed with /ai/interview
 * Mobile app expects /v1/ai/interview/* paths
 * All routes require authentication
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * POST /ai/interview/start
 * Start a new interview session
 * Mobile app path: /v1/ai/interview/start
 * 
 * Request body: { interviewType: string }
 * Response: { sessionId: string, questions: string[] }
 * 
 * Requirement 6.1: Create session record and return interview questions
 */
router.post(
  '/start',
  authMiddleware as any,
  validateBody(startInterviewSchema),
  interviewController.startInterview
);

/**
 * POST /ai/interview/submit
 * Submit interview responses for analysis
 * Mobile app path: /v1/ai/interview/submit
 * 
 * Request: multipart/form-data with:
 *   - sessionId: string (required)
 *   - audio: file (required)
 *   - video: file (optional)
 * Response: { confidenceScore: number, grammarScore: number, feedback: string, performanceMetrics?: object }
 * 
 * Requirements 6.2, 6.3, 6.4: Forward to AI microservice, analyze responses, store results
 * 
 * Note: Validation happens after multer processes the multipart data
 */
router.post(
  '/submit',
  authMiddleware as any,
  uploadInterviewFiles,
  validateBody(submitInterviewSchema),
  interviewController.submitInterview
);

/**
 * GET /ai/interview/:sessionId
 * Get interview session and results
 * For future use - not currently used by mobile app
 * 
 * Request params: { sessionId: string }
 * Response: { session: InterviewSession }
 * 
 * Requirement 6.5: Fetch interview session and results
 */
router.get(
  '/:sessionId',
  authMiddleware as any,
  interviewController.getInterview
);

export default router;
