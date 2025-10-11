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

describe('Interview Integration Tests', () => {
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
        email: 'interview@example.com',
        password: 'Password123!',
        name: 'Interview User',
      });

    authToken = signupResponse.body.token;
    userId = signupResponse.body.user.id;
  });

  describe('POST /v1/ai/interview/start', () => {
    it('should start an interview session', async () => {
      // Mock FastAPI response for question generation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: [
            'Tell me about yourself',
            'What are your strengths?',
            'Where do you see yourself in 5 years?',
          ],
        },
      });

      const response = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          interviewType: 'job',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('questions');
      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.questions.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/ai/interview/start')
        .send({
          interviewType: 'job',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid interview type', async () => {
      const response = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          interviewType: '',
        });

      expect(response.status).toBe(400);
    });

    it('should support different interview types', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: [
            'How was your day?',
            'What are your hobbies?',
          ],
        },
      });

      const response = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          interviewType: 'casual',
        });

      expect(response.status).toBe(200);
      expect(response.body.questions.length).toBeGreaterThan(0);
    });

    it('should generate unique session IDs', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          questions: ['Question 1', 'Question 2'],
        },
      });

      const response1 = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      const response2 = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      expect(response1.body.sessionId).not.toBe(response2.body.sessionId);
    });
  });

  describe('POST /v1/ai/interview/submit', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Start an interview session first
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: ['Tell me about yourself'],
        },
      });

      const startResponse = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      sessionId = startResponse.body.sessionId;
    });

    it('should submit interview with audio only', async () => {
      // Mock FastAPI analysis response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.82,
          grammarScore: 0.88,
          feedback: 'Good response with clear communication',
          performanceMetrics: {
            fluency: 0.85,
            vocabulary: 0.80,
          },
        },
      });

      // Create mock audio file
      const mockAudioPath = path.join(__dirname, 'interview-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('confidenceScore');
      expect(response.body).toHaveProperty('grammarScore');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(response.body.confidenceScore).toBeLessThanOrEqual(1);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });

    it('should submit interview with audio and video', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          bodyLanguage: {
            eyeContact: 0.88,
            posture: 0.85,
          },
          feedback: 'Excellent presentation with good body language',
          performanceMetrics: {
            fluency: 0.87,
            vocabulary: 0.83,
          },
        },
      });

      // Create mock files
      const mockAudioPath = path.join(__dirname, 'interview-audio.wav');
      const mockVideoPath = path.join(__dirname, 'interview-video.mp4');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));
      fs.writeFileSync(mockVideoPath, Buffer.from('mock video data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath)
        .attach('video', mockVideoPath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('confidenceScore');
      expect(response.body).toHaveProperty('grammarScore');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body).toHaveProperty('performanceMetrics');

      // Clean up
      fs.unlinkSync(mockAudioPath);
      fs.unlinkSync(mockVideoPath);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .field('sessionId', sessionId);

      expect(response.status).toBe(401);
    });

    it('should return 400 without sessionId', async () => {
      const mockAudioPath = path.join(__dirname, 'no-session-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(400);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });

    it('should return 400 without audio file', async () => {
      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId);

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid sessionId', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const mockAudioPath = path.join(__dirname, 'invalid-session-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', 'invalid-session-id')
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(404);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });

    it('should handle FastAPI analysis errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Analysis failed'));

      const mockAudioPath = path.join(__dirname, 'error-interview-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(503);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });
  });

  describe('GET /v1/ai/interview/:sessionId', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Start an interview session
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: ['Test question'],
        },
      });

      const startResponse = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      sessionId = startResponse.body.sessionId;
    });

    it('should get interview session details', async () => {
      const response = await request(app)
        .get(`/v1/ai/interview/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
      expect(response.body.session).toHaveProperty('sessionId', sessionId);
      expect(response.body.session).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/v1/ai/interview/${sessionId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/v1/ai/interview/non-existent-session-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should include results if interview is completed', async () => {
      // Submit interview first
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          feedback: 'Great job!',
          performanceMetrics: {},
        },
      });

      const mockAudioPath = path.join(__dirname, 'complete-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath);

      // Get session details
      const response = await request(app)
        .get(`/v1/ai/interview/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.session.status).toBe('completed');
      expect(response.body).toHaveProperty('results');

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });
  });

  describe('Interview flow: start → submit → get results', () => {
    it('should complete full interview flow', async () => {
      // 1. Start interview
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: [
            'Tell me about yourself',
            'What are your strengths?',
          ],
        },
      });

      const startResponse = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      expect(startResponse.status).toBe(200);
      const { sessionId, questions } = startResponse.body;
      expect(questions.length).toBe(2);

      // 2. Submit interview
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.88,
          grammarScore: 0.92,
          feedback: 'Excellent interview performance',
          performanceMetrics: {
            fluency: 0.90,
            vocabulary: 0.85,
            clarity: 0.88,
          },
        },
      });

      const mockAudioPath = path.join(__dirname, 'flow-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const submitResponse = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath);

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.confidenceScore).toBeGreaterThan(0.8);
      expect(submitResponse.body.grammarScore).toBeGreaterThan(0.9);

      // 3. Get interview results
      const getResponse = await request(app)
        .get(`/v1/ai/interview/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.session.status).toBe('completed');
      expect(getResponse.body.results).toBeDefined();
      expect(getResponse.body.results.confidenceScore).toBe(0.88);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });
  });

  describe('Interview performance metrics', () => {
    it('should provide detailed performance metrics', async () => {
      // Start interview
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          questions: ['Test question'],
        },
      });

      const startResponse = await request(app)
        .post('/v1/ai/interview/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewType: 'job' });

      const sessionId = startResponse.body.sessionId;

      // Submit with detailed metrics
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          confidence: 0.85,
          grammarScore: 0.90,
          feedback: 'Strong performance',
          performanceMetrics: {
            fluency: 0.88,
            vocabulary: 0.82,
            clarity: 0.86,
            pace: 0.84,
            pronunciation: 0.87,
          },
        },
      });

      const mockAudioPath = path.join(__dirname, 'metrics-audio.wav');
      fs.writeFileSync(mockAudioPath, Buffer.from('mock audio data'));

      const response = await request(app)
        .post('/v1/ai/interview/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('audio', mockAudioPath);

      expect(response.status).toBe(200);
      expect(response.body.performanceMetrics).toBeDefined();
      expect(response.body.performanceMetrics.fluency).toBeGreaterThan(0);
      expect(response.body.performanceMetrics.vocabulary).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(mockAudioPath);
    });
  });
});
