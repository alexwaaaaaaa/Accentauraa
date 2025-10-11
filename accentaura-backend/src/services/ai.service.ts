import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';
import logger from '../config/logger';
import { ExternalServiceError } from '../utils/errors.util';
import { AIInteractionLog } from '../models/aiInteractionLog.model';

/**
 * Chat Request/Response Types
 */
export interface ChatRequest {
  prompt: string;
  userId: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: string;
  audioUrl?: string;
}

/**
 * Speech Analysis Types
 */
export interface SpeechAnalysisRequest {
  audioFile: Buffer;
  userId: string;
  filename?: string;
}

export interface SpeechAnalysisResponse {
  score: number;
  feedback: string;
  details?: {
    confidence?: number;
    grammarScore?: number;
    pronunciation?: Record<string, any>;
  };
}

/**
 * Confidence Analysis Types
 */
export interface ConfidenceAnalysisRequest {
  text: string;
}

export interface ConfidenceAnalysisResponse {
  confidence: number;
  suggestions: string[];
}

/**
 * Interview Analysis Types
 */
export interface InterviewAnalysisRequest {
  audioFile: Buffer;
  videoFile?: Buffer;
  questions: string[];
  userId: string;
  audioFilename?: string;
  videoFilename?: string;
}

export interface InterviewAnalysisResponse {
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
 * AI Service Class
 * 
 * Handles all AI-related operations by communicating with the FastAPI microservice
 * and logging interactions to MongoDB.
 */
export class AIService {
  private axiosInstance: AxiosInstance;
  private readonly fastApiUrl: string;
  private readonly timeout: number = 30000; // 30 seconds
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second base delay

  constructor() {
    this.fastApiUrl = env.FASTAPI_URL;

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.fastApiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('FastAPI Request', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('FastAPI Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('FastAPI Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('FastAPI Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Chat with AI
   * 
   * Sends a chat prompt to the FastAPI microservice and returns the AI response.
   * Mobile app expects: { message: string, audioUrl?: string }
   * 
   * @param request - Chat request containing prompt, userId, and optional conversationId
   * @returns Chat response with message and optional audio URL
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      logger.info('AI Chat Request', {
        userId: request.userId,
        conversationId: request.conversationId,
        promptLength: request.prompt.length,
      });

      // Call FastAPI chat endpoint
      const response = await this.callFastAPI<{ response: string; conversationId: string }>(
        '/chat',
        {
          prompt: request.prompt,
          conversationId: request.conversationId,
        }
      );

      // Log interaction to MongoDB
      await this.logInteraction({
        userId: request.userId,
        type: 'chat',
        prompt: request.prompt,
        response: response.response,
        conversationId: response.conversationId,
      });

      // Return in format expected by mobile app
      return {
        message: response.response,
        audioUrl: undefined, // Can be populated if TTS is implemented
      };
    } catch (error) {
      logger.error('AI Chat Error', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Analyze Speech
   * 
   * Sends an audio file to the FastAPI microservice for speech analysis.
   * Mobile app expects: { score: number, feedback: string, details?: object }
   * 
   * @param request - Speech analysis request with audio file and userId
   * @returns Speech analysis with score, feedback, and details
   */
  async analyzeSpeech(request: SpeechAnalysisRequest): Promise<SpeechAnalysisResponse> {
    try {
      logger.info('AI Speech Analysis Request', {
        userId: request.userId,
        fileSize: request.audioFile.length,
        filename: request.filename,
      });

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('audio', request.audioFile, {
        filename: request.filename || 'audio.wav',
        contentType: 'audio/wav',
      });

      // Call FastAPI speech analysis endpoint
      const response = await this.callFastAPI<{
        confidence: number;
        grammarScore: number;
        feedback: string;
        pronunciation?: Record<string, any>;
      }>(
        '/analyze/speech',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      // Calculate overall score (average of confidence and grammar)
      const score = (response.confidence + response.grammarScore) / 2;

      // Log interaction to MongoDB
      await this.logInteraction({
        userId: request.userId,
        type: 'speech',
        analysis: {
          confidence: response.confidence,
          grammarScore: response.grammarScore,
          feedback: response.feedback,
          pronunciation: response.pronunciation,
        },
      });

      // Return in format expected by mobile app
      return {
        score,
        feedback: response.feedback,
        details: {
          confidence: response.confidence,
          grammarScore: response.grammarScore,
          pronunciation: response.pronunciation,
        },
      };
    } catch (error) {
      logger.error('AI Speech Analysis Error', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Analyze Confidence
   * 
   * Analyzes text for confidence level and provides suggestions.
   * This is for future use and not currently used by the mobile app.
   * 
   * @param request - Confidence analysis request with text
   * @returns Confidence score and suggestions
   */
  async analyzeConfidence(request: ConfidenceAnalysisRequest): Promise<ConfidenceAnalysisResponse> {
    try {
      logger.info('AI Confidence Analysis Request', {
        textLength: request.text.length,
      });

      // Call FastAPI confidence analysis endpoint
      const response = await this.callFastAPI<{
        confidence: number;
        suggestions: string[];
      }>(
        '/analyze/confidence',
        {
          text: request.text,
        }
      );

      return {
        confidence: response.confidence,
        suggestions: response.suggestions,
      };
    } catch (error) {
      logger.error('AI Confidence Analysis Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Analyze Interview
   * 
   * Sends audio and optional video files to the FastAPI microservice for interview analysis.
   * Mobile app expects: { confidenceScore: number, grammarScore: number, feedback: string, performanceMetrics?: object }
   * 
   * @param request - Interview analysis request with audio, optional video, and questions
   * @returns Interview analysis with scores, feedback, and performance metrics
   */
  async analyzeInterview(request: InterviewAnalysisRequest): Promise<InterviewAnalysisResponse> {
    try {
      logger.info('AI Interview Analysis Request', {
        userId: request.userId,
        audioFileSize: request.audioFile.length,
        videoFileSize: request.videoFile?.length,
        questionsCount: request.questions.length,
      });

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('audio', request.audioFile, {
        filename: request.audioFilename || 'audio.wav',
        contentType: 'audio/wav',
      });

      if (request.videoFile) {
        formData.append('video', request.videoFile, {
          filename: request.videoFilename || 'video.mp4',
          contentType: 'video/mp4',
        });
      }

      formData.append('questions', JSON.stringify(request.questions));

      // Call FastAPI interview analysis endpoint
      const response = await this.callFastAPI<{
        confidence: number;
        grammarScore: number;
        bodyLanguage?: Record<string, any>;
        feedback: string;
        mistakes?: string[];
        strengths?: string[];
      }>(
        '/interview/analyze',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      // Log interaction to MongoDB
      await this.logInteraction({
        userId: request.userId,
        type: 'interview',
        analysis: {
          confidence: response.confidence,
          grammarScore: response.grammarScore,
          feedback: response.feedback,
          bodyLanguage: response.bodyLanguage,
        },
        metadata: {
          questionsCount: request.questions.length,
          hasVideo: !!request.videoFile,
        },
      });

      // Return in format expected by mobile app
      return {
        confidenceScore: response.confidence,
        grammarScore: response.grammarScore,
        feedback: response.feedback,
        performanceMetrics: {
          bodyLanguage: response.bodyLanguage,
          mistakes: response.mistakes,
          strengths: response.strengths,
        },
      };
    } catch (error) {
      logger.error('AI Interview Analysis Error', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Call FastAPI with retry logic and timeout
   * 
   * Generic method to call FastAPI endpoints with automatic retry on failure.
   * Implements exponential backoff for retries.
   * 
   * @param endpoint - API endpoint path
   * @param data - Request data (JSON or FormData)
   * @param config - Additional axios config
   * @returns Response data from FastAPI
   */
  private async callFastAPI<T>(
    endpoint: string,
    data: any,
    config?: any
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`FastAPI Call Attempt ${attempt}/${this.maxRetries}`, {
          endpoint,
          attempt,
        });

        const response = await this.axiosInstance.post<T>(endpoint, data, config);
        
        logger.info('FastAPI Call Success', {
          endpoint,
          attempt,
          status: response.status,
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        logger.warn('FastAPI Call Failed', {
          endpoint,
          attempt,
          maxRetries: this.maxRetries,
          isRetryable,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // If not retryable or last attempt, throw error
        if (!isRetryable || attempt === this.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.debug(`Retrying after ${delay}ms`, { endpoint, attempt });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries failed, throw ExternalServiceError
    const errorMessage = lastError instanceof AxiosError
      ? lastError.response?.data?.message || lastError.message
      : lastError?.message || 'Unknown error';

    throw new ExternalServiceError('FastAPI', errorMessage);
  }

  /**
   * Check if error is retryable
   * 
   * Determines if an error should trigger a retry based on error type and status code.
   * 
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Timeout errors are retryable
    if (error.code === 'ECONNABORTED') {
      return true;
    }

    // 5xx server errors are retryable
    if (error.response?.status >= 500) {
      return true;
    }

    // 429 Too Many Requests is retryable
    if (error.response?.status === 429) {
      return true;
    }

    // All other errors are not retryable (4xx client errors, etc.)
    return false;
  }

  /**
   * Sleep utility for retry delays
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log AI Interaction to MongoDB
   * 
   * Stores AI interaction logs in MongoDB for analytics and debugging.
   * 
   * @param data - Interaction data to log
   */
  private async logInteraction(data: {
    userId: string;
    type: 'chat' | 'speech' | 'interview';
    prompt?: string;
    response?: string;
    audioUrl?: string;
    videoUrl?: string;
    analysis?: {
      confidence?: number;
      grammarScore?: number;
      feedback?: string;
      pronunciation?: Record<string, any>;
      bodyLanguage?: Record<string, any>;
    };
    conversationId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await AIInteractionLog.create({
        userId: data.userId,
        type: data.type,
        prompt: data.prompt,
        response: data.response,
        audioUrl: data.audioUrl,
        videoUrl: data.videoUrl,
        analysis: data.analysis,
        conversationId: data.conversationId,
        timestamp: new Date(),
        metadata: data.metadata,
      });

      logger.debug('AI Interaction Logged', {
        userId: data.userId,
        type: data.type,
      });
    } catch (error) {
      // Log error but don't throw - logging failure shouldn't break the main flow
      logger.error('Failed to log AI interaction', {
        userId: data.userId,
        type: data.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
