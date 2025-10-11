import { LessonService } from '../lesson.service';
import prisma from '../../config/db';
import { NotFoundError } from '../../utils/errors.util';
import { LessonType } from '@prisma/client';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    progress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('LessonService', () => {
  let lessonService: LessonService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    currentLevel: 1,
    totalXp: 0,
    streak: 0,
    coins: 0,
  };

  const mockLessons = [
    {
      id: 'lesson-1',
      level: 1,
      title: 'Lesson 1',
      type: LessonType.VOCABULARY,
      xpReward: 100,
      content: { activities: [] },
      mediaUrls: null,
    },
    {
      id: 'lesson-2',
      level: 2,
      title: 'Lesson 2',
      type: LessonType.GRAMMAR,
      xpReward: 150,
      content: { activities: [] },
      mediaUrls: null,
    },
    {
      id: 'lesson-3',
      level: 3,
      title: 'Lesson 3',
      type: LessonType.SPEAKING,
      xpReward: 200,
      content: { activities: [] },
      mediaUrls: null,
    },
  ];

  beforeEach(() => {
    lessonService = new LessonService();
    jest.clearAllMocks();
  });

  describe('getLessons', () => {
    it('should return lessons with lock and completion status', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue(mockLessons);
      (prisma.progress.findMany as jest.Mock).mockResolvedValue([
        { lessonId: 'lesson-1', completed: true },
      ]);

      const result = await lessonService.getLessons(1, 3, mockUser.id);

      expect(result).toHaveLength(3);
      expect(result[0].isLocked).toBe(false); // Level 1 is always unlocked
      expect(result[0].isCompleted).toBe(true);
      expect(result[1].isLocked).toBe(false); // Level 2 unlocked because level 1 completed
      expect(result[1].isCompleted).toBe(false);
      expect(result[2].isLocked).toBe(true); // Level 3 locked because level 2 not completed
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        lessonService.getLessons(1, 10, 'invalid-user-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return empty array if no lessons in range', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.progress.findMany as jest.Mock).mockResolvedValue([]);

      const result = await lessonService.getLessons(100, 200, mockUser.id);

      expect(result).toHaveLength(0);
    });

    it('should mark all lessons as unlocked if all previous lessons completed', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue(mockLessons);
      (prisma.progress.findMany as jest.Mock).mockResolvedValue([
        { lessonId: 'lesson-1', completed: true },
        { lessonId: 'lesson-2', completed: true },
      ]);

      const result = await lessonService.getLessons(1, 3, mockUser.id);

      expect(result[0].isLocked).toBe(false);
      expect(result[1].isLocked).toBe(false);
      expect(result[2].isLocked).toBe(false);
    });
  });

  describe('getLesson', () => {
    it('should return lesson by ID with lock and completion status', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLessons[1]);
      (prisma.progress.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Current lesson progress
        .mockResolvedValueOnce({ completed: true }); // Previous lesson progress

      const result = await lessonService.getLesson('lesson-2', mockUser.id);

      expect(result.id).toBe('lesson-2');
      expect(result.level).toBe(2);
      expect(result.isLocked).toBe(false);
      expect(result.isCompleted).toBe(false);
      expect(result.activities).toBeDefined();
    });

    it('should return lesson by level number', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLessons[0]);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await lessonService.getLesson('1', mockUser.id);

      expect(result.level).toBe(1);
      expect(result.isLocked).toBe(false); // Level 1 is always unlocked
    });

    it('should throw NotFoundError if lesson not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        lessonService.getLesson('invalid-lesson-id', mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        lessonService.getLesson('lesson-1', 'invalid-user-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should mark lesson as locked if previous lesson not completed', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLessons[1]);
      (prisma.progress.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Current lesson progress
        .mockResolvedValueOnce(null); // Previous lesson progress (not completed)

      const result = await lessonService.getLesson('lesson-2', mockUser.id);

      expect(result.isLocked).toBe(true);
    });

    it('should mark lesson as completed if progress exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLessons[0]);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue({ completed: true });

      const result = await lessonService.getLesson('lesson-1', mockUser.id);

      expect(result.isCompleted).toBe(true);
    });
  });

  describe('completeLesson', () => {
    it('should complete lesson and award XP', async () => {
      const mockLesson = mockLessons[0];
      const mockUserFull = {
        ...mockUser,
        totalXp: 0,
        currentLevel: 1,
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.progress.create as jest.Mock).mockResolvedValue({
        completed: true,
        score: 0.9,
        xpEarned: 90,
        attempts: 1,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await lessonService.completeLesson(mockUser.id, mockLesson.id, 0.9, 300);

      expect(result.xpEarned).toBeGreaterThan(0);
      expect(result.progress.completed).toBe(true);
      expect(result.progress.score).toBe(0.9);
      expect(prisma.progress.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should update existing progress if lesson already attempted', async () => {
      const mockLesson = mockLessons[0];
      const mockUserFull = {
        ...mockUser,
        totalXp: 100,
        currentLevel: 1,
      };
      const existingProgress = {
        completed: false,
        score: 0.5,
        xpEarned: 50,
        attempts: 1,
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(existingProgress);
      (prisma.progress.update as jest.Mock).mockResolvedValue({
        completed: true,
        score: 0.95,
        xpEarned: 95,
        attempts: 2,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await lessonService.completeLesson(mockUser.id, mockLesson.id, 0.95, 250);

      expect(result.progress.attempts).toBe(2);
      expect(prisma.progress.update).toHaveBeenCalled();
    });

    it('should trigger level up when XP threshold reached', async () => {
      const mockLesson = mockLessons[0];
      const mockUserFull = {
        ...mockUser,
        totalXp: 950, // Close to level up (1000 XP)
        currentLevel: 1,
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.progress.create as jest.Mock).mockResolvedValue({
        completed: true,
        score: 1.0,
        xpEarned: 110,
        attempts: 1,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await lessonService.completeLesson(mockUser.id, mockLesson.id, 1.0, 200);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    it('should throw NotFoundError if lesson not found', async () => {
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        lessonService.completeLesson(mockUser.id, 'invalid-lesson-id', 0.9, 300)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLessons[0]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        lessonService.completeLesson('invalid-user-id', mockLessons[0].id, 0.9, 300)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if trying to complete locked lesson', async () => {
      const mockLesson = mockLessons[1]; // Level 2
      const mockUserFull = {
        ...mockUser,
        totalXp: 0,
        currentLevel: 1,
      };

      (prisma.lesson.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(mockLessons[0]); // Previous lesson
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null); // Previous lesson not completed

      await expect(
        lessonService.completeLesson(mockUser.id, mockLesson.id, 0.9, 300)
      ).rejects.toThrow('Cannot complete a locked lesson');
    });

    it('should calculate XP with perfect score bonus', async () => {
      const mockLesson = mockLessons[0];
      const mockUserFull = {
        ...mockUser,
        totalXp: 0,
        currentLevel: 1,
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.progress.create as jest.Mock).mockResolvedValue({
        completed: true,
        score: 1.0,
        xpEarned: 110,
        attempts: 1,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await lessonService.completeLesson(mockUser.id, mockLesson.id, 1.0, 200);

      // Perfect score (1.0) should give bonus XP
      expect(result.xpEarned).toBeGreaterThan(mockLesson.xpReward);
    });

    it('should calculate XP with time bonus for fast completion', async () => {
      const mockLesson = mockLessons[0];
      const mockUserFull = {
        ...mockUser,
        totalXp: 0,
        currentLevel: 1,
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFull);
      (prisma.progress.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.progress.create as jest.Mock).mockResolvedValue({
        completed: true,
        score: 0.9,
        xpEarned: 100,
        attempts: 1,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await lessonService.completeLesson(mockUser.id, mockLesson.id, 0.9, 100);

      // Fast completion (100s < 300s optimal) should give time bonus
      expect(result.xpEarned).toBeGreaterThan(mockLesson.xpReward * 0.9);
    });
  });
});
