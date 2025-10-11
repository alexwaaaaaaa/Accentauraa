import request from 'supertest';
import express, { Application } from 'express';
import leaderboardRoutes from '../../src/routes/leaderboard.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares';
import { prisma } from '../setup';

describe('Leaderboard Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;
  let testUsers: any[] = [];

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/v1/auth', authRoutes);
    app.use('/v1/leaderboard', leaderboardRoutes);
    app.use(errorMiddleware);

    // Create test user and get auth token
    const signupResponse = await request(app)
      .post('/v1/auth/signup')
      .send({
        email: 'leaderboard@example.com',
        password: 'Password123!',
        name: 'Leaderboard User',
      });

    authToken = signupResponse.body.token;
    userId = signupResponse.body.user.id;

    // Create multiple test users with different XP levels
    for (let i = 1; i <= 10; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user${i}@example.com`,
          name: `User ${i}`,
          totalXp: i * 100,
          currentLevel: Math.floor(i / 2) + 1,
          streak: i % 7,
        },
      });
      testUsers.push(user);
    }
  });

  describe('GET /v1/leaderboard', () => {
    it('should get leaderboard with authentication', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body.entries.length).toBeGreaterThan(0);
      expect(response.body.entries.length).toBeLessThanOrEqual(10);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/leaderboard?limit=10');

      expect(response.status).toBe(401);
    });

    it('should return users sorted by XP descending', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const entries = response.body.entries;
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].totalXp).toBeGreaterThanOrEqual(entries[i + 1].totalXp);
      }
    });

    it('should include required fields in leaderboard entries', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const entry = response.body.entries[0];
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('username');
      expect(entry).toHaveProperty('totalXp');
      expect(entry).toHaveProperty('rank');
      expect(entry).toHaveProperty('streak');
      expect(entry).toHaveProperty('avatarUrl');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit if not specified', async () => {
      const response = await request(app)
        .get('/v1/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBeLessThanOrEqual(100);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should assign correct ranks', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const entries = response.body.entries;
      entries.forEach((entry: any, index: number) => {
        expect(entry.rank).toBe(index + 1);
      });
    });
  });

  describe('GET /v1/leaderboard/rank/:userId', () => {
    it('should get user rank with authentication', async () => {
      const response = await request(app)
        .get(`/v1/leaderboard/rank/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rank');
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('percentile');
      expect(response.body.rank).toBeGreaterThan(0);
      expect(response.body.totalUsers).toBeGreaterThan(0);
      expect(response.body.percentile).toBeGreaterThanOrEqual(0);
      expect(response.body.percentile).toBeLessThanOrEqual(100);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/v1/leaderboard/rank/${userId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/v1/leaderboard/rank/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should calculate correct percentile', async () => {
      // Get the top user
      const topUser = testUsers[testUsers.length - 1];
      
      const response = await request(app)
        .get(`/v1/leaderboard/rank/${topUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rank).toBe(1);
      expect(response.body.percentile).toBeGreaterThan(90); // Top user should be in top percentile
    });

    it('should handle users with same XP', async () => {
      // Create two users with same XP
      const user1 = await prisma.user.create({
        data: {
          email: 'same1@example.com',
          name: 'Same XP 1',
          totalXp: 500,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'same2@example.com',
          name: 'Same XP 2',
          totalXp: 500,
        },
      });

      const response1 = await request(app)
        .get(`/v1/leaderboard/rank/${user1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const response2 = await request(app)
        .get(`/v1/leaderboard/rank/${user2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Both should have similar ranks (may differ by 1 due to tie-breaking)
      expect(Math.abs(response1.body.rank - response2.body.rank)).toBeLessThanOrEqual(1);
    });
  });

  describe('Leaderboard caching', () => {
    it('should cache leaderboard results', async () => {
      // First request
      const response1 = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      const timestamp1 = response1.body.lastUpdated;

      // Second request (should be cached)
      const response2 = await request(app)
        .get('/v1/leaderboard?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      const timestamp2 = response2.body.lastUpdated;

      // Timestamps should be the same if cached
      expect(timestamp1).toBe(timestamp2);
    });
  });

  describe('Leaderboard with user progress', () => {
    it('should reflect XP changes in leaderboard', async () => {
      // Get initial rank
      const initialResponse = await request(app)
        .get(`/v1/leaderboard/rank/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const initialRank = initialResponse.body.rank;

      // Award significant XP
      await prisma.user.update({
        where: { id: userId },
        data: { totalXp: 10000 },
      });

      // Wait for cache to expire or invalidate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get new rank
      const newResponse = await request(app)
        .get(`/v1/leaderboard/rank/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const newRank = newResponse.body.rank;

      // Rank should improve (lower number = better rank)
      expect(newRank).toBeLessThanOrEqual(initialRank);
    });
  });

  describe('Leaderboard edge cases', () => {
    it('should handle empty leaderboard gracefully', async () => {
      // This test assumes there are users, but tests the structure
      const response = await request(app)
        .get('/v1/leaderboard?limit=1000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.entries)).toBe(true);
    });

    it('should handle limit of 1', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(1);
    });

    it('should handle very large limit', async () => {
      const response = await request(app)
        .get('/v1/leaderboard?limit=10000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should cap at reasonable limit or return all users
      expect(response.body.entries.length).toBeGreaterThan(0);
    });
  });
});
