import axios from 'axios';
import { ExternalServiceError } from '../../utils/errors.util';
import { AIInteractionLog } from '../../models/aiInteractionLog.model';

// Mock axios instance
const mockAxiosInstance = {
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn((fn: any) => fn) },
    response: { use: jest.fn((fn: any) => fn) },
  },
};

// Mock dependencies BEFORE importing AIService
jest.mock('axios');
(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

jest.mock('../../models/aiInteractionLog.model', () => ({
  AIInteractionLog: {
    create: jest.fn(),
  },
}));

jest.mock('../../config/env', () => ({
  env: {
    FASTAPI_URL: 'http://localhost:8000',
  },
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Import AIService AFTER mocks are set up
import { AIService } from '../ai.service';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe('chat', () => {
    it('should send chat request and return response', async () => {
      const mockResponse = {
        data: {
          response: 'Hello! How can I help you?',
          conversationId: 'conv-123',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await aiService.chat({
        prompt: 'Hello',
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat',
        {
          prompt: 'Hello',
          conversationId: 'conv-123',
        },
        undefined
      );
      expect(result.message).toBe('Hello! How can I help you?');
      expect(result.audioUrl).toBeUndefined();
      expect(AIInteractionLog.create).toHaveBeenCalled();
    });

    it('should handle chat without conversationId', async () => {
      const mockResponse = {
        data: {
          response: 'Hello!',
          conversationId: 'new-conv-123',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await aiService.chat({
        prompt: 'Hello',
        userId: 'user-123',
      });

      expect(result.message).toBe('Hello!');
    });

    it('should throw ExternalServiceError on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(
        aiService.chat({
          prompt: 'Hello',
          userId: 'user-123',
        })
      ).rejects.toThrow(ExternalServiceError);
    });

    it('should retry on retryable errors', async () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: {
            response: 'Success after retries',
            conversationId: 'conv-123',
          },
        });

      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await aiService.chat({
        prompt: 'Hello',
        userId: 'user-123',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result.message).toBe('Success after retries');
    });
  });

  describe('analyzeSpeech', () => {
    it('should analyze speech and return results', async () => {
      const mockResponse = {
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          feedback: 'Good pronunciation',
          pronunciation: { clarity: 0.88 },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const audioBuffer = Buffer.from('fake-audio-data');
      const result = await aiService.analyzeSpeech({
        audioFile: audioBuffer,
        userId: 'user-123',
        filename: 'audio.wav',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/analyze/speech',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
      expect(result.score).toBe(0.875); // Average of 0.85 and 0.90
      expect(result.feedback).toBe('Good pronunciation');
      expect(result.details?.confidence).toBe(0.85);
      expect(result.details?.grammarScore).toBe(0.90);
      expect(AIInteractionLog.create).toHaveBeenCalled();
    });

    it('should handle speech analysis without filename', async () => {
      const mockResponse = {
        data: {
          confidence: 0.80,
          grammarScore: 0.85,
          feedback: 'Needs improvement',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const audioBuffer = Buffer.from('fake-audio-data');
      const result = await aiService.analyzeSpeech({
        audioFile: audioBuffer,
        userId: 'user-123',
      });

      expect(result.score).toBe(0.825);
    });

    it('should throw ExternalServiceError on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Analysis failed'));

      const audioBuffer = Buffer.from('fake-audio-data');
      await expect(
        aiService.analyzeSpeech({
          audioFile: audioBuffer,
          userId: 'user-123',
        })
      ).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('analyzeConfidence', () => {
    it('should analyze text confidence', async () => {
      const mockResponse = {
        data: {
          confidence: 0.75,
          suggestions: [
            'Use more assertive language',
            'Avoid filler words',
          ],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.analyzeConfidence({
        text: 'I think maybe we could try this approach',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/analyze/confidence',
        {
          text: 'I think maybe we could try this approach',
        },
        undefined
      );
      expect(result.confidence).toBe(0.75);
      expect(result.suggestions).toHaveLength(2);
    });

    it('should throw ExternalServiceError on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Analysis failed'));

      await expect(
        aiService.analyzeConfidence({
          text: 'Test text',
        })
      ).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('analyzeInterview', () => {
    it('should analyze interview with audio only', async () => {
      const mockResponse = {
        data: {
          confidence: 0.82,
          grammarScore: 0.88,
          feedback: 'Good interview performance',
          mistakes: ['Minor grammar error'],
          strengths: ['Clear communication'],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const audioBuffer = Buffer.from('fake-audio-data');
      const result = await aiService.analyzeInterview({
        audioFile: audioBuffer,
        questions: ['Tell me about yourself', 'What are your strengths?'],
        userId: 'user-123',
        audioFilename: 'interview.wav',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/interview/analyze',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
      expect(result.confidenceScore).toBe(0.82);
      expect(result.grammarScore).toBe(0.88);
      expect(result.feedback).toBe('Good interview performance');
      expect(result.performanceMetrics?.mistakes).toHaveLength(1);
      expect(AIInteractionLog.create).toHaveBeenCalled();
    });

    it('should analyze interview with audio and video', async () => {
      const mockResponse = {
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          bodyLanguage: { posture: 'good', eyeContact: 'excellent' },
          feedback: 'Excellent interview',
          mistakes: [],
          strengths: ['Confident', 'Clear'],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const audioBuffer = Buffer.from('fake-audio-data');
      const videoBuffer = Buffer.from('fake-video-data');
      const result = await aiService.analyzeInterview({
        audioFile: audioBuffer,
        videoFile: videoBuffer,
        questions: ['Tell me about yourself'],
        userId: 'user-123',
        audioFilename: 'interview.wav',
        videoFilename: 'interview.mp4',
      });

      expect(result.confidenceScore).toBe(0.85);
      expect(result.performanceMetrics?.bodyLanguage).toBeDefined();
    });

    it('should throw ExternalServiceError on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Analysis failed'));

      const audioBuffer = Buffer.from('fake-audio-data');
      await expect(
        aiService.analyzeInterview({
          audioFile: audioBuffer,
          questions: ['Question 1'],
          userId: 'user-123',
        })
      ).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('retry logic', () => {
    it('should not retry on 4xx client errors', async () => {
      const clientError = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(clientError);

      await expect(
        aiService.chat({
          prompt: 'Hello',
          userId: 'user-123',
        })
      ).rejects.toThrow(ExternalServiceError);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError);

      await expect(
        aiService.chat({
          prompt: 'Hello',
          userId: 'user-123',
        })
      ).rejects.toThrow(ExternalServiceError);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should retry on 429 Too Many Requests', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: {
            response: 'Success',
            conversationId: 'conv-123',
          },
        });

      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await aiService.chat({
        prompt: 'Hello',
        userId: 'user-123',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.message).toBe('Success');
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Timeout',
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          data: {
            response: 'Success',
            conversationId: 'conv-123',
          },
        });

      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const result = await aiService.chat({
        prompt: 'Hello',
        userId: 'user-123',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.message).toBe('Success');
    });
  });

  describe('interaction logging', () => {
    it('should log chat interactions', async () => {
      const mockResponse = {
        data: {
          response: 'Test response',
          conversationId: 'conv-123',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      await aiService.chat({
        prompt: 'Test prompt',
        userId: 'user-123',
        conversationId: 'conv-123',
      });

      expect(AIInteractionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'chat',
          prompt: 'Test prompt',
          response: 'Test response',
          conversationId: 'conv-123',
        })
      );
    });

    it('should log speech analysis interactions', async () => {
      const mockResponse = {
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          feedback: 'Good',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockResolvedValue({});

      const audioBuffer = Buffer.from('fake-audio-data');
      await aiService.analyzeSpeech({
        audioFile: audioBuffer,
        userId: 'user-123',
      });

      expect(AIInteractionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'speech',
          analysis: expect.objectContaining({
            confidence: 0.85,
            grammarScore: 0.90,
          }),
        })
      );
    });

    it('should not throw if logging fails', async () => {
      const mockResponse = {
        data: {
          response: 'Test response',
          conversationId: 'conv-123',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      (AIInteractionLog.create as jest.Mock).mockRejectedValue(new Error('Logging failed'));

      // Should not throw even if logging fails
      await expect(
        aiService.chat({
          prompt: 'Test',
          userId: 'user-123',
        })
      ).resolves.toBeDefined();
    });
  });
});
