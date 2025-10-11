import request from 'supertest';
import express, { Application } from 'express';
import lessonRoutes from '../lesson.routes';
import { errorMiddleware } from '../../middlewares/error.middleware';
import * as lessonController from '../../controllers/lesson.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Mock the controllers
jest.mock('../../controllers/lesson.controller');
jest.mock('../../middlewares/auth.middleware');

describe('Lesson Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/lessons', lessonRoutes);
    app.use(errorMiddleware);

    // Mock auth middleware to pass through
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 'test-user-id', email: 'test@example.com' };
      next();
    });

    jest.clearAllMocks();
  });

  describe('GET /lessons', () => {
    it('should call getLessons controller with valid query params', async () => {
      const mockLessons = [
        { id: '1', level: 1, title: 'Lesson 1', type: 'VOCABULARY', xpReward: 100, isLocked: false, isCompleted: false },
        { id: '2', level: 2, title: 'Lesson 2', type: 'GRAMMAR', xpReward: 150, isLocked: true, isCompleted: false },
      ];

      (lessonController.getLessons as jest.Mock).mockImplementation((_req, res) => {
        res.json({ lessons: mockLessons });
      });

      const response = await request(app)
        .get('/lessons?from=1&to=10')
        .expect(200);

      expect(lessonController.getLessons).toHaveBeenCalled();
      expect(response.body).toEqual({ lessons: mockLessons });
    });

    it('should return 400 if from is missing', async () => {
      const response = await request(app)
        .get('/lessons?to=10')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if to is missing', async () => {
      const response = await request(app)
        .get('/lessons?from=1')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if from is not a number', async () => {
      const response = await request(app)
        .get('/lessons?from=abc&to=10')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if to is not a number', async () => {
      const response = await request(app)
        .get('/lessons?from=1&to=xyz')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if from is greater than to', async () => {
      const response = await request(app)
        .get('/lessons?from=10&to=1')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if from is less than 1', async () => {
      const response = await request(app)
        .get('/lessons?from=0&to=10')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('GET /lessons/:level', () => {
    it('should call getLesson controller with valid level param', async () => {
      const mockLesson = {
        id: '1',
        level: 5,
        title: 'Lesson 5',
        type: 'SPEAKING',
        xpReward: 200,
        activities: [],
        mediaUrls: [],
        isLocked: false,
        isCompleted: false,
      };

      (lessonController.getLesson as jest.Mock).mockImplementation((_req, res) => {
        res.json(mockLesson);
      });

      const response = await request(app)
        .get('/lessons/5')
        .expect(200);

      expect(lessonController.getLesson).toHaveBeenCalled();
      expect(response.body).toEqual(mockLesson);
    });

    it('should return 400 if level is not a number', async () => {
      const response = await request(app)
        .get('/lessons/abc')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /lessons/complete', () => {
    it('should call completeLesson controller with valid body', async () => {
      const mockResult = {
        xpEarned: 150,
        totalXp: 1500,
        newLevel: 5,
        leveledUp: true,
        progress: {},
      };

      (lessonController.completeLesson as jest.Mock).mockImplementation((_req, res) => {
        res.json(mockResult);
      });

      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          score: 0.85,
          timeTaken: 120,
        })
        .expect(200);

      expect(lessonController.completeLesson).toHaveBeenCalled();
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 if lessonId is missing', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          score: 0.85,
          timeTaken: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if lessonId is not a valid UUID', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: 'invalid-uuid',
          score: 0.85,
          timeTaken: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if score is missing', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          timeTaken: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if score is less than 0', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          score: -0.5,
          timeTaken: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if score is greater than 1', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          score: 1.5,
          timeTaken: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if timeTaken is missing', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          score: 0.85,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if timeTaken is negative', async () => {
      const response = await request(app)
        .post('/lessons/complete')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          score: 0.85,
          timeTaken: -10,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });
});
