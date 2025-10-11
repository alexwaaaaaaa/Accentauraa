import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { sendSuccess } from '../utils/response.util';
import { ValidationError } from '../utils/errors.util';
import logger from '../config/logger';
import fs from 'fs/promises';

/**
 * Interview Controller
 * Handles all interview-related HTTP requests
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * Start Interview Handler
 * POST /ai/interview/start
 * Mobile app expects sessionId and questions array
 * 
 * Request body: { interviewType: string }
 * Response: { sessionId: string, questions: string[] }
 * 
 * Requirement 6.1: Create session record and return interview questions
 */
export async function startInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { interviewType } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    if (!interviewType) {
      throw new ValidationError([{ field: 'interviewType', message: 'Interview type is required' }]);
    }

    logger.info('Start Interview request', {
      userId,
      interviewType,
    });

    const result = await interviewService.startInterview({
      userId,
      interviewType,
    });

    logger.info('Interview started successfully', {
      userId,
      sessionId: result.sessionId,
      questionsCount: result.questions.length,
    });

    // Mobile app expects direct response with sessionId and questions array
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Submit Interview Handler
 * POST /ai/interview/submit
 * Mobile app sends sessionId, audio, optional video
 * Expects confidenceScore, grammarScore, feedback, performanceMetrics
 * 
 * Request: multipart/form-data with sessionId, audio file, optional video file
 * Response: { confidenceScore: number, grammarScore: number, feedback: string, performanceMetrics?: object }
 * 
 * Requirements 6.2, 6.3, 6.4: Forward to AI microservice, analyze responses, store results
 */
export async function submitInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.body;
    const userId = (req as any).user?.userId;
    const files = (req as any).files;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    if (!sessionId) {
      throw new ValidationError([{ field: 'sessionId', message: 'Session ID is required' }]);
    }

    if (!files || !files.audio || files.audio.length === 0) {
      throw new ValidationError([{ field: 'audio', message: 'Audio file is required' }]);
    }

    const audioFile = files.audio[0];
    const videoFile = files.video ? files.video[0] : undefined;

    logger.info('Submit Interview request', {
      userId,
      sessionId,
      audioFilename: audioFile.originalname,
      audioSize: audioFile.size,
      hasVideo: !!videoFile,
      videoFilename: videoFile?.originalname,
      videoSize: videoFile?.size,
    });

    // Read the uploaded files
    const audioBuffer = await fs.readFile(audioFile.path);
    const videoBuffer = videoFile ? await fs.readFile(videoFile.path) : undefined;

    // Call interview service for submission and analysis
    const result = await interviewService.submitInterview({
      sessionId,
      userId,
      audioFile: audioBuffer,
      videoFile: videoBuffer,
      audioFilename: audioFile.originalname,
      videoFilename: videoFile?.originalname,
    });

    // Clean up uploaded files
    try {
      await fs.unlink(audioFile.path);
      if (videoFile) {
        await fs.unlink(videoFile.path);
      }
    } catch (unlinkError) {
      logger.warn('Failed to delete uploaded files', {
        audioPath: audioFile.path,
        videoPath: videoFile?.path,
        error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error',
      });
    }

    logger.info('Interview submitted successfully', {
      userId,
      sessionId,
      confidenceScore: result.confidenceScore,
      grammarScore: result.grammarScore,
    });

    // Mobile app expects direct response with scores, feedback, and performance metrics
    sendSuccess(res, result);
  } catch (error) {
    // Clean up uploaded files on error
    const files = (req as any).files;
    if (files) {
      const cleanupPromises: Promise<void>[] = [];
      
      if (files.audio && files.audio[0]?.path) {
        cleanupPromises.push(
          fs.unlink(files.audio[0].path).catch((err) => {
            logger.warn('Failed to delete audio file after error', {
              path: files.audio[0].path,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          })
        );
      }
      
      if (files.video && files.video[0]?.path) {
        cleanupPromises.push(
          fs.unlink(files.video[0].path).catch((err) => {
            logger.warn('Failed to delete video file after error', {
              path: files.video[0].path,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          })
        );
      }
      
      await Promise.all(cleanupPromises);
    }
    next(error);
  }
}

/**
 * Get Interview Handler
 * GET /ai/interview/:sessionId
 * For future use - retrieves interview session and results
 * 
 * Request params: { sessionId: string }
 * Response: { session: InterviewSession }
 * 
 * Requirement 6.5: Fetch interview session and results
 */
export async function getInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    if (!sessionId) {
      throw new ValidationError([{ field: 'sessionId', message: 'Session ID is required' }]);
    }

    logger.info('Get Interview request', {
      userId,
      sessionId,
    });

    const result = await interviewService.getInterview(sessionId, userId);

    logger.info('Interview retrieved successfully', {
      userId,
      sessionId,
      status: result.session.status,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
