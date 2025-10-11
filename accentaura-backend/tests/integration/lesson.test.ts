import request from 'supertest';
import express, { Application } from 'express';
import lessonRoutes from '../../src/routes/lesson.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares';
import { prisma } from '../setup';

describe('Lesson Integration Tests', () => {
  let app: Application;
  let authToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/v1/auth', authRoutes);
    app.use('/v1/lessons', lessonRoutes);
    app.use(errorMiddleware);

    // Create test user and get auth token
    const signupResponse = await request(app)
      .post('/v1/auth/signup')
      .send({
        email: 'lesson@example.com',
        password: 'Password123!',
        name: 'Lesson User',
      });

    authToken = signupResponse.body.token;

    // Create test lessons
    await prisma.lesson.createMany({
      data: [
        {
          level: 1,
          title: 'Introduction to Greetings',
          type: 'VOCABULARY',
          xpReward: 10,
          content: {
            activities: [
              {
                type: 'flashcard',
                word: 'Hello',
                translation: 'Hola',
                pronunciation: '/həˈloʊ/',
              },
            ],
          },
        },
        {
          level: 2,
          title: 'Basic Conversations',
          type: 'SPEAKING',
          xpReward: 15,
          content: {
            activities: [
              {
                type: 'mcq',
                question: 'How do you say "Good morning"?',
                options: ['Buenos días', 'Buenas noches', 'Buenas tardes', 'Hola'],
                correctAnswer: 0,
              },
            ],
          },
        },
        {
          level: 3,
          title: 'Grammar Basics',
          type: 'GRAMMAR',
          xpReward: 20,
          content: {
            activities: [
              {
                type: 'fill-in-blank',
                sentence: 'I ___ a student',
                correctAnswer: 'am',
              },
            ],
          },
        },
      ],
    });
  });

  describe('GET /v1/lessons', () => {
    it('should get lessons with authentication', async () => {
      const response = await request(app)
        .get('/v1/lessons?from=1&to=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lessons');
      expect(Array.isArray(response.body.lessons)).toBe(true);
      expect(response.body.lessons.length).toBeGreaterThan(0);
      
      const lesson = response.body.lessons[0];
      expect(lesson).toHaveProperty('id');
      expect(lesson).toHaveProperty('level');
      expect(lesson).toHaveProperty('title');
      expect(lesson).toHaveProperty('type');
      expect(lesson).toHaveProperty('xpReward');
      expect(lesson).toHaveProperty('isLocked');
      expect(lesson).toHaveProperty('isCompleted');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/lessons?from=1&to=10');

      expect(response.status).toBe(401);
    });

    it('should filter lessons by range', async () => {
      const response = await request(app)
        .get('/v1/lessons?from=1&to=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lessons.length).toBeLessThanOrEqual(2);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/v1/lessons?from=invalid&to=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should mark first lesson as unlocked', async () => {
      const response = await request(app)
        .get('/v1/lessons?from=1&to=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const firstLesson = response.body.lessons.find((l: any) => l.level === 1);
      expect(firstLesson.isLocked).toBe(false);
    });
  });

  describe('GET /v1/lessons/:level', () => {
    it('should get specific lesson by level', async () => {
      const response = await request(app)
        .get('/v1/lessons/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lesson');
      expect(response.body.lesson).toMatchObject({
        level: 1,
        title: 'Introduction to Greetings',
        type: 'VOCABULARY',
      });
      expect(response.body.lesson.content).toHaveProperty('activities');
      expect(Array.isArray(response.body.lesson.content.activities)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/lessons/1');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent lesson', async () => {
      const response = await request(app)
        .get('/v1/lessons/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should include lesson activities', async () => {
      const response = await request(app)
        .get('/v1/lessons/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lesson.content.activities.length).toBeGreaterThan(0);
      
      const activity = response.body.lesson.content.activities[0];
      expect(activity).toHaveProperty('type');
    });
  });

  describe('POST /v1/lessons/complete', () => {
    it('should complete a lesson and award XP', async () => {
      const response = await request(app)
        .post('/v1/lessons/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: (await prisma.lesson.findFirst({ where: { level: 1 } }))?.id,
          score: 0.9,
          timeTaken: 120,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('xpEarned');
      expect(response.body.xpEarned).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('progress');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/lessons/complete')
        .send({
          lessonId: 'some-id',
          score: 0.9,
          timeTaken: 120,
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid score', async () => {
      const response = await request(app)
        .post('/v1/lessons/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: (await prisma.lesson.findFirst({ where: { level: 1 } }))?.id,
          score: 1.5, // Invalid score > 1
          timeTaken: 120,
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent lesson', async () => {
      const response = await request(app)
        .post('/v1/lessons/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: '00000000-0000-0000-0000-000000000000',
          score: 0.9,
          timeTaken: 120,
        });

      expect(response.status).toBe(404);
    });

    it('should update lesson completion status', async () => {
      const lesson = await prisma.lesson.findFirst({ where: { level: 2 } });
      
      await request(app)
        .post('/v1/lessons/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: lesson?.id,
          score: 0.85,
          timeTaken: 180,
        });

      // Check if lesson is marked as completed
      const lessonsResponse = await request(app)
        .get('/v1/lessons?from=1&to=10')
        .set('Authorization', `Bearer ${authToken}`);

      const completedLesson = lessonsResponse.body.lessons.find(
        (l: any) => l.level === 2
      );
      expect(completedLesson.isCompleted).toBe(true);
    });
  });

  describe('Lesson progression', () => {
    it('should unlock next lesson after completing current one', async () => {
      const lesson1 = await prisma.lesson.findFirst({ where: { level: 1 } });
      
      // Complete lesson 1
      await request(app)
        .post('/v1/lessons/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: lesson1?.id,
          score: 0.9,
          timeTaken: 120,
        });

      // Check if lesson 2 is unlocked
      const lessonsResponse = await request(app)
        .get('/v1/lessons?from=1&to=10')
        .set('Authorization', `Bearer ${authToken}`);

      const lesson2 = lessonsResponse.body.lessons.find((l: any) => l.level === 2);
      expect(lesson2.isLocked).toBe(false);
    });
  });
});
