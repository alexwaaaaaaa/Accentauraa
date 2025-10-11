import request from 'supertest';
import express, { Application } from 'express';
import progressRoutes from '../../src/routes/progress.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares';
import { prisma } from '../setup';

describe('Progress Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/v1/auth', authRoutes);
    app.use('/v1/progress', progressRoutes);
    app.use(errorMiddleware);

    // Create test user and get auth token
    const signupResponse = await request(app)
      .post('/v1/auth/signup')
      .send({
        email: 'progress@example.com',
        password: 'Password123!',
        name: 'Progress User',
      });

    authToken = signupResponse.body.token;
    userId = signupResponse.body.user.id;

    // Create test lessons
    await prisma.lesson.createMany({
      data: [
        {
          level: 1,
          title: 'Lesson 1',
          type: 'VOCABULARY',
          xpReward: 10,
          content: { activities: [] },
        },
        {
          level: 2,
          title: 'Lesson 2',
          type: 'GRAMMAR',
          xpReward: 15,
          content: { activities: [] },
        },
      ],
    });
  });

  describe('GET /v1/progress/:userId', () => {
    it('should get user progress with authentication', async () => {
      const response = await request(app)
        .get(`/v1/progress/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('currentLevel');
      expect(response.body).toHaveProperty('totalXp');
      expect(response.body).toHaveProperty('streak');
      expect(response.body).toHaveProperty('coins');
      expect(response.body).toHaveProperty('badges');
      expect(response.body).toHaveProperty('lessonProgress');
      expect(Array.isArray(response.body.badges)).toBe(true);
      expect(Array.isArray(response.body.lessonProgress)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/v1/progress/${userId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/v1/progress/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should include lesson progress details', async () => {
      const lesson = await prisma.lesson.findFirst({ where: { level: 1 } });
      
      // Create progress entry
      await prisma.progress.create({
        data: {
          userId,
          lessonId: lesson!.id,
          completed: true,
          score: 0.9,
          xpEarned: 10,
        },
      });

      const response = await request(app)
        .get(`/v1/progress/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lessonProgress.length).toBeGreaterThan(0);
      
      const lessonProgress = response.body.lessonProgress[0];
      expect(lessonProgress).toHaveProperty('lessonId');
      expect(lessonProgress).toHaveProperty('completed');
      expect(lessonProgress).toHaveProperty('score');
    });
  });

  describe('POST /v1/progress', () => {
    it('should save progress update', async () => {
      const lesson = await prisma.lesson.findFirst({ where: { level: 1 } });

      const response = await request(app)
        .post('/v1/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: lesson?.id,
          completed: true,
          score: 0.85,
          xpEarned: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress).toHaveProperty('completed', true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/progress')
        .send({
          lessonId: 'some-id',
          completed: true,
          score: 0.85,
          xpEarned: 10,
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/v1/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: 'some-id',
          completed: true,
          score: 1.5, // Invalid score
          xpEarned: 10,
        });

      expect(response.status).toBe(400);
    });

    it('should update existing progress', async () => {
      const lesson = await prisma.lesson.findFirst({ where: { level: 2 } });

      // First save
      await request(app)
        .post('/v1/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: lesson?.id,
          completed: false,
          score: 0.5,
          xpEarned: 5,
        });

      // Update with better score
      const response = await request(app)
        .post('/v1/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: lesson?.id,
          completed: true,
          score: 0.9,
          xpEarned: 15,
        });

      expect(response.status).toBe(200);
      expect(response.body.progress.completed).toBe(true);
      expect(response.body.progress.score).toBe(0.9);
    });
  });

  describe('POST /v1/progress/sync', () => {
    it('should sync multiple progress updates', async () => {
      const lessons = await prisma.lesson.findMany({ take: 2 });

      const response = await request(app)
        .post('/v1/progress/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          updates: [
            {
              lessonId: lessons[0].id,
              completed: true,
              score: 0.9,
              timestamp: new Date().toISOString(),
            },
            {
              lessonId: lessons[1].id,
              completed: true,
              score: 0.85,
              timestamp: new Date().toISOString(),
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('synced');
      expect(response.body.synced).toBe(2);
      expect(response.body).toHaveProperty('progress');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/progress/sync')
        .send({
          updates: [],
        });

      expect(response.status).toBe(401);
    });

    it('should handle empty updates array', async () => {
      const response = await request(app)
        .post('/v1/progress/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          updates: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.synced).toBe(0);
    });
  });

  describe('POST /v1/progress/xp', () => {
    it('should award XP to user', async () => {
      const response = await request(app)
        .post('/v1/progress/xp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          source: 'lesson_completion',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalXp');
      expect(response.body.totalXp).toBeGreaterThanOrEqual(50);
      expect(response.body).toHaveProperty('currentLevel');
      expect(response.body).toHaveProperty('leveledUp');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/progress/xp')
        .send({
          amount: 50,
          source: 'lesson_completion',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for negative XP', async () => {
      const response = await request(app)
        .post('/v1/progress/xp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -10,
          source: 'test',
        });

      expect(response.status).toBe(400);
    });

    it('should trigger level up when threshold reached', async () => {
      // Award enough XP to level up (assuming level 1 requires 100 XP)
      const response = await request(app)
        .post('/v1/progress/xp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          source: 'test',
        });

      expect(response.status).toBe(200);
      expect(response.body.currentLevel).toBeGreaterThan(1);
      expect(response.body.leveledUp).toBe(true);
    });
  });

  describe('POST /v1/progress/streak', () => {
    it('should update user streak', async () => {
      const response = await request(app)
        .post('/v1/progress/streak')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('streak');
      expect(response.body).toHaveProperty('lastActivityDate');
      expect(response.body.streak).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/v1/progress/streak');

      expect(response.status).toBe(401);
    });

    it('should increment streak on consecutive days', async () => {
      // First update
      const response1 = await request(app)
        .post('/v1/progress/streak')
        .set('Authorization', `Bearer ${authToken}`);

      const streak1 = response1.body.streak;

      // Update user's last activity to yesterday
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      // Second update (should increment)
      const response2 = await request(app)
        .post('/v1/progress/streak')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.body.streak).toBe(streak1 + 1);
    });
  });
});
