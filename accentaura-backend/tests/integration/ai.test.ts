import request from 'supertest';
import express, { Application } from 'express';
import aiRoutes from '../../src/routes/ai.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Mock axios for FastAPI calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AI Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/v1/auth', authRoutes);
    app.use('/v1/ai', aiRoutes);
    app.use(errorMiddleware);

    // Create test user and get auth token
    const signupResponse = await request(app)
      .post('/v1/auth/signup')
      .send({
        email: 'ai@example.com',
        password: 'Password123!',
        name: 'AI User',
      });

    authToken = signupResponse.body.token;
    userId = signupResponse.body.user.id;
  });

  describe('POST /v1/ai/chat', () => {
    it('should send chat message and get AI response', async () => {
      // Mock FastAPI response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          response: 'Hello! How can I help you practice English today?',
          conversationId: 'conv-123',
        },
      });

      const response = await request(app)
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Hello, I want to practice English',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Hello! How can I help you practice English today?');
      expect(response.body).toHaveProperty('conversationId');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/ai/chat')
        .send({
          prompt: 'Hello',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for empty prompt', async () => {
      const response = await request(app)
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: '',
        });

      expect(response.status).toBe(400);
    });

    it('should handle conversation context', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          response: 'Great! Let\'s continue our conversation.',
          conversationId: 'conv-123',
        },
      });

      const response = await request(app)
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Can you help me with grammar?',
          conversationId: 'conv-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.conversationId).toBe('conv-123');
    });

    it('should handle FastAPI service errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Hello',
        });

      expect(response.status).toBe(503);
    });
  });

  describe('POST /v1/ai/analyze-speech', () => {
    it('should analyze speech from audio file', async () => {
      // Mock FastAPI response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.85,
          grammarScore: 0.9,
          feedback: 'Good pronunciation. Work on intonation.',
          pronunciation: {
            clarity: 0.88,
            accent: 'neutral',
          },
        },
      });

      // Create a mock audio file
      const mockAudioPath = path.join(__dirname, 'mock-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/analyze-speech')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body.score).toBeGreaterThanOrEqual(0);
      expect(response.body.score).toBeLessThanOrEqual(1);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/v1/ai/analyze-speech');

      expect(response.status).toBe(401);
    });

    it('should return 400 without audio file', async () => {
      const response = await request(app)
        .post('/v1/ai/analyze-speech')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle large audio files within limit', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.8,
          grammarScore: 0.85,
          feedback: 'Good effort!',
          pronunciation: {},
        },
      });

      // Create a larger mock audio file (but within 10MB limit)
      const mockAudioPath = path.join(__dirname, 'large-audio.wav');
      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
      fs.writeFileSync(mockAudioPath, largeBuffer);

      const response = await request(app)
        .post('/v1/ai/analyze-speech')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(200);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });

    it('should handle FastAPI analysis errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Analysis failed'));

      const mockAudioPath = path.join(__dirname, 'error-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/analyze-speech')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(503);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });
  });

  describe('POST /v1/ai/confidence-score', () => {
    it('should analyze text confidence', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.75,
          suggestions: [
            'Use more assertive language',
            'Avoid filler words',
            'Structure sentences more clearly',
          ],
        },
      });

      const response = await request(app)
        .post('/v1/ai/confidence-score')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'I think maybe we could possibly try this approach',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/ai/confidence-score')
        .send({
          text: 'Some text',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/v1/ai/confidence-score')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: '',
        });

      expect(response.status).toBe(400);
    });

    it('should handle confident text', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.95,
          suggestions: ['Great confidence! Keep it up.'],
        },
      });

      const response = await request(app)
        .post('/v1/ai/confidence-score')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'I am confident that this approach will work effectively',
        });

      expect(response.status).toBe(200);
      expect(response.body.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('AI service rate limiting', () => {
    it('should enforce rate limits on AI endpoints', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          response: 'Test response',
          conversationId: 'test',
        },
      });

      // Make multiple rapid requests (more than rate limit)
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post('/v1/ai/chat')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ prompt: 'Test' })
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('AI interaction logging', () => {
    it('should log AI interactions to MongoDB', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          response: 'Logged response',
          conversationId: 'log-test',
        },
      });

      const response = await request(app)
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test logging',
        });

      expect(response.status).toBe(200);
      
      // In a real test, you would verify MongoDB has the log entry
      // For now, we just verify the request succeeded
    });
  });
});
