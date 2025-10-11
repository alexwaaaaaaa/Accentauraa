import request from 'supertest';
import express, { Application } from 'express';
import leaderboardRoutes from '../leaderboard.routes';
import { errorMiddleware } from '../../middlewares/error.middleware';
import { leaderboardService } from '../../services/leaderboard.service';
import * as jwtUtil from '../../utils/jwt.util';

// Mock dependencies
jest.mock('../../services/leaderboard.service', () => ({
  leaderboardService: {
    getLeaderboard: jest.fn(),
    getUserRank: jest.fn(),
  },
}));
jest.mock('../../utils/jwt.util');
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Leaderboard Routes', () => {
  let app: Application;
  const mockToken = 'valid.jwt.token';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/leaderboard', leaderboardRoutes);
    app.use(errorMiddleware);

    // Mock JWT verification
    (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
      userId: mockUserId,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    jest.clearAllMocks();
  });

  describe('GET /leaderboard', () => {
    const mockLeaderboardData = {
      entries: [
        {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          username: 'User1',
          avatarUrl: 'https://example.com/avatar1.jpg',
          totalXp: 1000,
          rank: 1,
          streak: 5,
        },
        {
          userId: '123e4567-e89b-12d3-a456-426614174002',
          username: 'User2',
          avatarUrl: 'https://example.com/avatar2.jpg',
          totalXp: 900,
          rank: 2,
          streak: 3,
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    it('should return leaderboard with default limit', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboardData);

      const response = await request(app)
        .get('/leaderboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboardData);
      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith(100);
    });

    it('should return leaderboard with custom limit', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboardData);

      const response = await request(app)
        .get('/leaderboard?limit=50')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboardData);
      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith(50);
    });

    it('should reject request without authorization', async () => {
      const response = await request(app).get('/leaderboard');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid limit (too low)', async () => {
      const response = await request(app)
        .get('/leaderboard?limit=0')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject invalid limit (too high)', async () => {
      const response = await request(app)
        .get('/leaderboard?limit=1001')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject invalid limit (not a number)', async () => {
      const response = await request(app)
        .get('/leaderboard?limit=abc')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle service errors', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/leaderboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /leaderboard/rank/:userId', () => {
    const mockUserRankData = {
      rank: 42,
      totalUsers: 1000,
      percentile: 95.8,
    };

    it('should return user rank', async () => {
      (leaderboardService.getUserRank as jest.Mock).mockResolvedValue(mockUserRankData);

      const response = await request(app)
        .get(`/leaderboard/rank/${mockUserId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserRankData);
      expect(leaderboardService.getUserRank).toHaveBeenCalledWith(mockUserId);
    });

    it('should reject request without authorization', async () => {
      const response = await request(app).get(`/leaderboard/rank/${mockUserId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid userId format', async () => {
      const response = await request(app)
        .get('/leaderboard/rank/invalid-uuid')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle service errors', async () => {
      (leaderboardService.getUserRank as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      const response = await request(app)
        .get(`/leaderboard/rank/${mockUserId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });
});
