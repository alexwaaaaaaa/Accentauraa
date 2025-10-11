import { ProgressService } from '../progress.service';
import prisma from '../../config/db';
import { NotFoundError, ConflictError } from '../../utils/errors.util';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lesson: {
      findUnique: jest.fn(),
    },
    progress: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    badge: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userBadge: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('ProgressService', () => {
  let progressService: ProgressService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    currentLevel: 1,
    totalXp: 500,
    streak: 3,
    coins: 100,
    lastActivityDate: new Date('2024-01-15'),
    badges: [],
    progress: [],
  };

  const mockLesson = {
    id: 'lesson-1',
    level: 1,
    title: 'Lesson 1',
    xpReward: 100,
  };

  beforeEach(() => {
    progressService = new ProgressService();
    jest.clearAllMocks();
  });

  describe('getUserProgress', () => {
    it('should return complete user progress data', async () => {
      const mockUserWithProgress = {
        ...mockUser,
        badges: [
          {
            badge: {
              id: 'badge-1',
              name: 'First Steps',
              description: 'Complete first lesson',
              iconUrl: 'https://example.com/badge.png',
            },
            earnedAt: new Date('2024-01-10'),
          },
        ],
        progress: [
          {
            lessonId: 'lesson-1',
            lesson: { level: 1 },
            completed: true,
            score: 0.9,
            xpEarned: 90,
            attempts: 1,
            completedAt: new Date('2024-01-10'),
          },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProgress);

      const result = await progressService.getUserProgress(mockUser.id);

      expect(result.currentLevel).toBe(1);
      expect(result.totalXp).toBe(500);
      expect(result.streak).toBe(3);
      expect(result.badges).toHaveLength(1);
      expect(result.lessonProgress).toHaveLength(1);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.getUserProgress('invalid-user-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return empty arrays for user with no progress', async () => {
      const newUser = {
        ...mockUser,
        badges: [],
        progress: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(newUser);

      const result = await progressService.getUserProgress(mockUser.id);

      expect(result.badges).toHaveLength(0);
      expect(result.lessonProgress).toHaveLength(0);
    });
  });

  describe('syncProgress', () => {
    it('should sync multiple progress updates successfully', async () => {
      const updates = [
        {
          lessonId: 'lesson-1',
          completed: true,
          score: 0.9,
          timeTaken: 300,
          timestamp: new Date(),
        },
        {
          lessonId: 'lesson-2',
          completed: true,
          score: 0.85,
          timeTaken: 350,
          timestamp: new Date(),
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.progress.create as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.badge.findMany as jest.Mock).mockResolvedValue([]);

      // Mock getUserProgress for final result
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        badges: [],
        progress: [],
      });

      const result = await progressService.syncProgress(mockUser.id, updates);

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.progress).toBeDefined();
    });

    it('should skip updates for non-existent lessons', async () => {
      const updates = [
        {
          lessonId: 'invalid-lesson',
          completed: true,
          score: 0.9,
          timeTaken: 300,
          timestamp: new Date(),
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.badge.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        badges: [],
        progress: [],
      });

      const result = await progressService.syncProgress(mockUser.id, updates);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should not overwrite completed lessons (server wins)', async () => {
      const updates = [
        {
          lessonId: 'lesson-1',
          completed: false,
          score: 0.5,
          timeTaken: 300,
          timestamp: new Date(),
        },
      ];

      const existingProgress = {
        completed: true,
        score: 0.9,
        xpEarned: 90,
        attempts: 1,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(existingProgress);
      (prisma.badge.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        badges: [],
        progress: [],
      });

      const result = await progressService.syncProgress(mockUser.id, updates);

      expect(result.synced).toBe(1);
      expect(prisma.progress.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.syncProgress('invalid-user-id', [])
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('awardXP', () => {
    it('should award XP and update user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.awardXP(mockUser.id, 100, 'test_source');

      expect(result.totalXp).toBe(600); // 500 + 100
      expect(result.currentLevel).toBe(1);
      expect(result.leveledUp).toBe(false);
    });

    it('should trigger level up when XP threshold reached', async () => {
      const userNearLevelUp = {
        ...mockUser,
        totalXp: 950,
        currentLevel: 1,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userNearLevelUp);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.awardXP(mockUser.id, 100, 'test_source');

      expect(result.totalXp).toBe(1050);
      expect(result.currentLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(1);
    });

    it('should handle multiple level ups', async () => {
      const userLowXP = {
        ...mockUser,
        totalXp: 500,
        currentLevel: 1,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userLowXP);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.awardXP(mockUser.id, 2000, 'test_source');

      expect(result.totalXp).toBe(2500);
      expect(result.currentLevel).toBe(3); // Level 3 (2000-2999 XP)
      expect(result.leveledUp).toBe(true);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.awardXP('invalid-user-id', 100, 'test_source')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStreak', () => {
    it('should increment streak for consecutive day activity', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const userWithYesterdayActivity = {
        ...mockUser,
        streak: 5,
        lastActivityDate: yesterday,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithYesterdayActivity);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.updateStreak(mockUser.id);

      expect(result.streak).toBe(6);
      expect(result.streakBroken).toBe(false);
    });

    it('should maintain streak for same day activity', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userWithTodayActivity = {
        ...mockUser,
        streak: 5,
        lastActivityDate: today,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithTodayActivity);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.updateStreak(mockUser.id);

      expect(result.streak).toBe(5);
      expect(result.streakBroken).toBe(false);
    });

    it('should reset streak if day was missed', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const userWithOldActivity = {
        ...mockUser,
        streak: 10,
        lastActivityDate: twoDaysAgo,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithOldActivity);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.updateStreak(mockUser.id);

      expect(result.streak).toBe(1);
      expect(result.streakBroken).toBe(true);
    });

    it('should start streak at 1 for first activity', async () => {
      const newUser = {
        ...mockUser,
        streak: 0,
        lastActivityDate: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(newUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await progressService.updateStreak(mockUser.id);

      expect(result.streak).toBe(1);
      expect(result.streakBroken).toBe(false);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.updateStreak('invalid-user-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('awardBadge', () => {
    const mockBadge = {
      id: 'badge-1',
      name: 'First Steps',
      description: 'Complete first lesson',
      iconUrl: 'https://example.com/badge.png',
      requirement: 'complete_1_lessons',
    };

    it('should award badge to user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.badge.findUnique as jest.Mock).mockResolvedValue(mockBadge);
      (prisma.userBadge.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userBadge.create as jest.Mock).mockResolvedValue({});

      await progressService.awardBadge(mockUser.id, mockBadge.id);

      expect(prisma.userBadge.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          badgeId: mockBadge.id,
        },
      });
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.awardBadge('invalid-user-id', mockBadge.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if badge not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.badge.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        progressService.awardBadge(mockUser.id, 'invalid-badge-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if user already has badge', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.badge.findUnique as jest.Mock).mockResolvedValue(mockBadge);
      (prisma.userBadge.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        badgeId: mockBadge.id,
      });

      await expect(
        progressService.awardBadge(mockUser.id, mockBadge.id)
      ).rejects.toThrow(ConflictError);
    });
  });
});
