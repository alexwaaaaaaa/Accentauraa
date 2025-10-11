import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { sendSuccess } from '../utils/response.util';
import { ValidationError } from '../utils/errors.util';
import logger from '../config/logger';
import fs from 'fs/promises';

/**
 * AI Controller
 * Handles all AI-related HTTP requests
 */

/**
 * Chat Handler
 * POST /ai/chat
 * Mobile app expects prompt in body, returns message and optional audioUrl
 * 
 * Request body: { prompt: string, conversationId?: string }
 * Response: { message: string, audioUrl?: string }
 */
export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt, conversationId } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    logger.info('AI Chat request', {
      userId,
      conversationId,
      promptLength: prompt?.length,
    });

    const result = await aiService.chat({
      prompt,
      userId,
      conversationId,
    });

    logger.info('AI Chat successful', {
      userId,
      conversationId,
      responseLength: result.message?.length,
    });

    // Mobile app expects direct response with message and optional audioUrl
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Speech Analyze Handler
 * POST /ai/analyze-speech
 * Mobile app sends audio file, expects score, feedback, details
 * 
 * Request: multipart/form-data with audio file
 * Response: { score: number, feedback: string, details?: object }
 */
export async function speechAnalyze(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const audioFile = (req as any).file;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    if (!audioFile) {
      throw new ValidationError([{ field: 'audio', message: 'Audio file is required' }]);
    }

    logger.info('AI Speech Analysis request', {
      userId,
      filename: audioFile.originalname,
      size: audioFile.size,
      mimetype: audioFile.mimetype,
    });

    // Read the uploaded file
    const audioBuffer = await fs.readFile(audioFile.path);

    // Call AI service for speech analysis
    const result = await aiService.analyzeSpeech({
      audioFile: audioBuffer,
      userId,
      filename: audioFile.originalname,
    });

    // Clean up uploaded file
    try {
      await fs.unlink(audioFile.path);
    } catch (unlinkError) {
      logger.warn('Failed to delete uploaded file', {
        path: audioFile.path,
        error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error',
      });
    }

    logger.info('AI Speech Analysis successful', {
      userId,
      score: result.score,
    });

    // Mobile app expects direct response with score, feedback, details
    sendSuccess(res, result);
  } catch (error) {
    // Clean up uploaded file on error
    const audioFile = (req as any).file;
    if (audioFile?.path) {
      try {
        await fs.unlink(audioFile.path);
      } catch (unlinkError) {
        logger.warn('Failed to delete uploaded file after error', {
          path: audioFile.path,
          error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error',
        });
      }
    }
    next(error);
  }
}

/**
 * Confidence Score Handler
 * POST /ai/confidence-score
 * For future use - analyzes text for confidence level
 * 
 * Request body: { text: string }
 * Response: { confidence: number, suggestions: string[] }
 */
export async function confidenceScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new ValidationError([{ field: 'user', message: 'User ID not found in request' }]);
    }

    logger.info('AI Confidence Score request', {
      userId,
      textLength: text?.length,
    });

    const result = await aiService.analyzeConfidence({ text });

    logger.info('AI Confidence Score successful', {
      userId,
      confidence: result.confidence,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
