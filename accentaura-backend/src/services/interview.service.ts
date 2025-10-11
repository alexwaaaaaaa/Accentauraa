import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { InterviewSession, IInterviewSession } from '../models/interviewSession.model';
import { aiService } from './ai.service';
import { NotFoundError, ValidationError } from '../utils/errors.util';

/**
 * Start Interview Request/Response Types
 */
export interface StartInterviewRequest {
  userId: string;
  interviewType: string;
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: string[];
}

/**
 * Submit Interview Request/Response Types
 */
export interface SubmitInterviewRequest {
  sessionId: string;
  userId: string;
  audioFile: Buffer;
  videoFile?: Buffer;
  audioFilename?: string;
  videoFilename?: string;
}

export interface SubmitInterviewResponse {
  confidenceScore: number;
  grammarScore: number;
  feedback: string;
  performanceMetrics?: {
    bodyLanguage?: Record<string, any>;
    mistakes?: string[];
    strengths?: string[];
  };
}

/**
 * Get Interview Response Type
 */
export interface GetInterviewResponse {
  session: IInterviewSession;
}

/**
 * Interview Service Class
 * 
 * Handles interview session management, question generation, and AI analysis integration.
 * Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class InterviewService {
  /**
   * Predefined interview questions by type
   * In production, these could be fetched from a database or generated dynamically
   */
  private readonly interviewQuestions: Record<string, string[]> = {
    job: [
      'Tell me about yourself and your background.',
      'Why are you interested in this position?',
      'What are your greatest strengths?',
      'What is your biggest weakness?',
      'Describe a challenging situation you faced and how you handled it.',
      'Where do you see yourself in five years?',
      'Why should we hire you?',
    ],
    casual: [
      'What do you like to do in your free time?',
      'Tell me about your favorite hobby.',
      'What kind of music do you enjoy?',
      'Describe your ideal weekend.',
      'What is your favorite food and why?',
    ],
    technical: [
      'Explain your experience with programming languages.',
      'Describe a complex technical problem you solved.',
      'How do you stay updated with new technologies?',
      'What is your approach to debugging code?',
      'Explain a technical concept to a non-technical person.',
    ],
    behavioral: [
      'Tell me about a time you worked in a team.',
      'Describe a situation where you had to meet a tight deadline.',
      'How do you handle conflict with colleagues?',
      'Give an example of when you showed leadership.',
      'Describe a time you failed and what you learned.',
    ],
  };

  /**
   * Start Interview
   * 
   * Creates a new interview session and generates questions based on interview type.
   * Requirement 6.1: Create session record and return interview questions
   * 
   * @param request - Start interview request with userId and interviewType
   * @returns Session ID and array of interview questions
   */
  async startInterview(request: StartInterviewRequest): Promise<StartInterviewResponse> {
    try {
      logger.info('Starting interview session', {
        userId: request.userId,
        interviewType: request.interviewType,
      });

      // Generate unique session ID
      const sessionId = uuidv4();

      // Get questions for the interview type
      const questions = this.generateQuestions(request.interviewType);

      if (questions.length === 0) {
        throw new ValidationError([
          {
            field: 'interviewType',
            message: `Invalid interview type: ${request.interviewType}. Valid types: ${Object.keys(this.interviewQuestions).join(', ')}`,
          },
        ]);
      }

      // Create interview session in MongoDB
      await InterviewSession.create({
        sessionId,
        userId: request.userId,
        interviewType: request.interviewType,
        questions,
        responses: [],
        status: 'in_progress',
        startedAt: new Date(),
      });

      logger.info('Interview session created', {
        sessionId,
        userId: request.userId,
        questionsCount: questions.length,
      });

      return {
        sessionId,
        questions,
      };
    } catch (error) {
      logger.error('Failed to start interview', {
        userId: request.userId,
        interviewType: request.interviewType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Submit Interview
   * 
   * Processes interview submission with audio/video files and performs AI analysis.
   * Requirements 6.2, 6.3, 6.4: Forward to AI microservice, analyze responses, store results
   * 
   * @param request - Submit interview request with sessionId, userId, and media files
   * @returns Interview analysis with scores, feedback, and performance metrics
   */
  async submitInterview(request: SubmitInterviewRequest): Promise<SubmitInterviewResponse> {
    try {
      logger.info('Submitting interview', {
        sessionId: request.sessionId,
        userId: request.userId,
        hasVideo: !!request.videoFile,
      });

      // Find interview session
      const session = await InterviewSession.findOne({
        sessionId: request.sessionId,
      });

      if (!session) {
        throw new NotFoundError(`Interview session not found: ${request.sessionId}`);
      }

      // Verify session belongs to user
      if (session.userId !== request.userId) {
        throw new ValidationError([
          {
            field: 'userId',
            message: 'Session does not belong to this user',
          },
        ]);
      }

      // Verify session is in progress
      if (session.status !== 'in_progress') {
        throw new ValidationError([
          {
            field: 'sessionId',
            message: `Interview session is ${session.status}, cannot submit`,
          },
        ]);
      }

      // Call AI service for interview analysis
      // Requirement 6.2: Forward audio/video to AI microservice
      const analysis = await aiService.analyzeInterview({
        audioFile: request.audioFile,
        videoFile: request.videoFile,
        questions: session.questions,
        userId: request.userId,
        audioFilename: request.audioFilename,
        videoFilename: request.videoFilename,
      });

      // Requirement 6.4: Store full interview result in MongoDB
      // Update session with final results
      session.finalResults = {
        overallConfidence: analysis.confidenceScore,
        grammarScore: analysis.grammarScore,
        feedback: analysis.feedback,
        mistakes: analysis.performanceMetrics?.mistakes || [],
        strengths: analysis.performanceMetrics?.strengths || [],
      };
      session.status = 'completed';
      session.completedAt = new Date();

      await session.save();

      logger.info('Interview submitted successfully', {
        sessionId: request.sessionId,
        userId: request.userId,
        confidenceScore: analysis.confidenceScore,
        grammarScore: analysis.grammarScore,
      });

      // Requirement 6.3: Return confidence score, grammar score, body language feedback, and mistake summary
      return {
        confidenceScore: analysis.confidenceScore,
        grammarScore: analysis.grammarScore,
        feedback: analysis.feedback,
        performanceMetrics: analysis.performanceMetrics,
      };
    } catch (error) {
      logger.error('Failed to submit interview', {
        sessionId: request.sessionId,
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get Interview
   * 
   * Retrieves an interview session by session ID.
   * Requirement 6.5: Fetch interview session and results
   * 
   * @param sessionId - Interview session ID
   * @param userId - User ID for authorization
   * @returns Interview session with all data
   */
  async getInterview(sessionId: string, userId: string): Promise<GetInterviewResponse> {
    try {
      logger.info('Fetching interview session', {
        sessionId,
        userId,
      });

      // Find interview session
      const session = await InterviewSession.findOne({
        sessionId,
      });

      if (!session) {
        throw new NotFoundError(`Interview session not found: ${sessionId}`);
      }

      // Verify session belongs to user
      if (session.userId !== userId) {
        throw new ValidationError([
          {
            field: 'userId',
            message: 'Session does not belong to this user',
          },
        ]);
      }

      logger.info('Interview session retrieved', {
        sessionId,
        userId,
        status: session.status,
      });

      return {
        session,
      };
    } catch (error) {
      logger.error('Failed to get interview', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate Questions
   * 
   * Generates interview questions based on interview type.
   * In production, this could use AI to generate dynamic questions.
   * 
   * @param interviewType - Type of interview (job, casual, technical, behavioral)
   * @returns Array of interview questions
   */
  private generateQuestions(interviewType: string): string[] {
    // Get questions for the specified type
    const questions = this.interviewQuestions[interviewType.toLowerCase()];

    if (!questions) {
      logger.warn('Unknown interview type, using default questions', {
        interviewType,
      });
      // Return job interview questions as default
      return this.interviewQuestions.job;
    }

    // Return a copy to avoid mutation
    return [...questions];
  }

  /**
   * Get User Interview History
   * 
   * Retrieves all interview sessions for a user.
   * This is a helper method for future use.
   * 
   * @param userId - User ID
   * @param limit - Maximum number of sessions to return
   * @returns Array of interview sessions
   */
  async getUserInterviewHistory(
    userId: string,
    limit: number = 10
  ): Promise<IInterviewSession[]> {
    try {
      logger.info('Fetching user interview history', {
        userId,
        limit,
      });

      const sessions = await InterviewSession.find({
        userId,
      })
        .sort({ startedAt: -1 })
        .limit(limit);

      logger.info('User interview history retrieved', {
        userId,
        count: sessions.length,
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to get user interview history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const interviewService = new InterviewService();
