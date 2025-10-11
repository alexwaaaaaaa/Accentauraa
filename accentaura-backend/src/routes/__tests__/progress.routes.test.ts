import request from 'supertest';
import express, { Application } from 'express';
import progressRoutes from '../progress.routes';
import * as progressController from '../../controllers/progress.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { errorMiddleware } from '../../middlewares/error.middleware';

// Mock the controllers
jest.mock('../../controllers/progress.controller');
jest.mock('../../middlewares/auth.middleware');

describe('Progress Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/progress', progressRoutes);
    // Add error middleware to handle validation errors
    app.use(errorMiddleware);

    // Mock auth middleware to pass through
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 'test-user-id', email: 'test@example.com' };
      next();
    });

    jest.clearAllMocks();
  });

  describe('GET /v1/progress/:userId', () => {
    it('should call getUserProgress controller with valid userId', async () => {
      const mockProgress = {
        currentLevel: 5,
        totalXp: 1000,
        streak: 7,
        coins: 500,
        lastActivityDate: new Date(),
        badges: [],
        lessonProgress: [],
      };

      (progressController.getUserProgress as jest.Mock).mockImplementation(
        (_req, res) => res.json(mockProgress)
      );

      const validUserId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app).get(`/v1/progress/${validUserId}`);

      expect(response.status).toBe(200);
      expect(progressController.getUserProgress).toHaveBeenCalled();
    });

    it('should return 400 for invalid userId format', async () => {
      const response = await request(app).get('/v1/progress/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /v1/progress', () => {
    it('should call saveProgress controller with valid data', async () => {
      const mockResult = {
        synced: 1,
        failed: 0,
        progress: {
          currentLevel: 5,
          totalXp: 1050,
          streak: 7,
          coins: 520,
        },
      };

      (progressController.saveProgress as jest.Mock).mockImplementation(
        (_req, res) => res.json(mockResult)
      );

      const validData = {
        lessonId: '123e4567-e89b-12d3-a456-426614174000',
        completed: true,
        score: 0.95,
        timeTaken: 120,
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/v1/progress')
        .send(validData);

      expect(response.status).toBe(200);
      expect(progressController.saveProgress).toHaveBeenCalled();
    });

    it('should return 400 for invalid lessonId', async () => {
      const invalidData = {
        lessonId: 'invalid-uuid',
        completed: true,
        score: 0.95,
      };

      const response = await request(app)
        .post('/v1/progress')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for invalid score (> 1)', async () => {
      const invalidData = {
        lessonId: '123e4567-e89b-12d3-a456-426614174000',
        completed: true,
        score: 1.5,
      };

      const response = await request(app)
        .post('/v1/progress')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for invalid score (< 0)', async () => {
      const invalidData = {
        lessonId: '123e4567-e89b-12d3-a456-426614174000',
        completed: true,
        score: -0.5,
      };

      const response = await request(app)
        .post('/v1/progress')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        lessonId: '123e4567-e89b-12d3-a456-426614174000',
        // missing completed and score
      };

      const response = await request(app)
        .post('/v1/progress')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /v1/progress/sync', () => {
    it('should call syncProgress controller with valid updates array', async () => {
      const mockResult = {
        synced: 3,
        failed: 0,
        progress: {
          currentLevel: 6,
          totalXp: 1200,
          streak: 8,
          coins: 600,
        },
      };

      (progressController.syncProgress as jest.Mock).mockImplementation(
        (_req, res) => res.json(mockResult)
      );

      const validData = {
        updates: [
          {
            lessonId: '123e4567-e89b-12d3-a456-426614174000',
            completed: true,
            score: 0.95,
            timeTaken: 120,
            timestamp: new Date().toISOString(),
          },
          {
            lessonId: '223e4567-e89b-12d3-a456-426614174000',
            completed: true,
            score: 0.88,
            timeTaken: 150,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post('/v1/progress/sync')
        .send(validData);

      expect(response.status).toBe(200);
      expect(progressController.syncProgress).toHaveBeenCalled();
    });

    it('should return 400 for empty updates array', async () => {
      const invalidData = {
        updates: [],
      };

      const response = await request(app)
        .post('/v1/progress/sync')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for invalid update in array', async () => {
      const invalidData = {
        updates: [
          {
            lessonId: 'invalid-uuid',
            completed: true,
            score: 0.95,
          },
        ],
      };

      const response = await request(app)
        .post('/v1/progress/sync')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /v1/progress/xp', () => {
    it('should call awardXP controller with valid data', async () => {
      const mockResult = {
        totalXp: 1100,
        currentLevel: 6,
        leveledUp: true,
        previousLevel: 5,
      };

      (progressController.awardXP as jest.Mock).mockImplementation(
        (_req, res) => res.json(mockResult)
      );

      const validData = {
        amount: 100,
        source: 'daily_bonus',
      };

      const response = await request(app)
        .post('/v1/progress/xp')
        .send(validData);

      expect(response.status).toBe(200);
      expect(progressController.awardXP).toHaveBeenCalled();
    });

    it('should return 400 for invalid amount (< 1)', async () => {
      const invalidData = {
        amount: 0,
        source: 'daily_bonus',
      };

      const response = await request(app)
        .post('/v1/progress/xp')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for missing source', async () => {
      const invalidData = {
        amount: 100,
      };

      const response = await request(app)
        .post('/v1/progress/xp')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /v1/progress/streak', () => {
    it('should call updateStreak controller', async () => {
      const mockResult = {
        streak: 8,
        lastActivityDate: new Date(),
        streakBroken: false,
      };

      (progressController.updateStreak as jest.Mock).mockImplementation(
        (_req, res) => res.json(mockResult)
      );

      const response = await request(app).post('/v1/progress/streak');

      expect(response.status).toBe(200);
      expect(progressController.updateStreak).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      // Mock auth middleware to reject
      (authMiddleware as any).mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const validUserId = '123e4567-e89b-12d3-a456-426614174000';
      
      const getUserResponse = await request(app).get(`/v1/progress/${validUserId}`);
      expect(getUserResponse.status).toBe(401);

      const saveResponse = await request(app)
        .post('/v1/progress')
        .send({
          lessonId: '123e4567-e89b-12d3-a456-426614174000',
          completed: true,
          score: 0.95,
        });
      expect(saveResponse.status).toBe(401);

      const syncResponse = await request(app)
        .post('/v1/progress/sync')
        .send({ updates: [] });
      expect(syncResponse.status).toBe(401);

      const xpResponse = await request(app)
        .post('/v1/progress/xp')
        .send({ amount: 100, source: 'test' });
      expect(xpResponse.status).toBe(401);

      const streakResponse = await request(app).post('/v1/progress/streak');
      expect(streakResponse.status).toBe(401);
    });
  });
});
