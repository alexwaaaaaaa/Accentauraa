import prisma from '../config/db';
import logger from '../config/logger';
import { NotFoundError } from '../utils/errors.util';
import { LessonType } from '@prisma/client';

/**
 * Lesson Response Interface
 * Returned by getLessons method
 */
export interface LessonListItem {
  id: string;
  level: number;
  title: string;
  type: LessonType;
  xpReward: number;
  isLocked: boolean;
  isCompleted: boolean;
}

/**
 * Full Lesson Interface
 * Returned by getLesson method
 */
export interface LessonDetail {
  id: string;
  level: number;
  title: string;
  type: LessonType;
  xpReward: number;
  activities: any; // JSONB content
  mediaUrls?: any; // JSONB array of URLs
  isLocked: boolean;
  isCompleted: boolean;
}

/**
 * Lesson Completion Result Interface
 */
export interface CompletionResult {
  xpEarned: number;
  totalXp: number;
  newLevel: number;
  leveledUp: boolean;
  progress: {
    completed: boolean;
    score: number;
    attempts: number;
  };
}

/**
 * LessonService Class
 * Handles all lesson-related operations
 */
export class LessonService {
  /**
   * Get lessons with lock status and completion status
   * @param from - Starting level (inclusive)
   * @param to - Ending level (inclusive)
   * @param userId - User's ID to check progress
   * @returns Array of lessons with lock and completion status
   */
  async getLessons(from: number, to: number, userId: string): Promise<LessonListItem[]> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Fetch lessons in the specified range
      const lessons = await prisma.lesson.findMany({
        where: {
          level: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          level: 'asc',
        },
        select: {
          id: true,
          level: true,
          title: true,
          type: true,
          xpReward: true,
        },
      });

      // Fetch ALL user's progress to determine which lessons are completed
      // We need to check if previous lessons are completed to determine lock status
      const allProgress = await prisma.progress.findMany({
        where: {
          userId,
          completed: true,
        },
        select: {
          lessonId: true,
          completed: true,
        },
      });

      // Create a map of completed lesson IDs
      const completedLessonIds = new Set(allProgress.map(p => p.lessonId));

      // Create a map of lesson level to lesson ID for quick lookup
      const lessonMap = new Map(lessons.map(l => [l.level, l.id]));

      // Map lessons with lock and completion status
      const lessonsWithStatus: LessonListItem[] = lessons.map(lesson => {
        const isCompleted = completedLessonIds.has(lesson.id);
        
        // Check if lesson is locked based on previous lesson completion
        const isLocked = this.checkLessonLock(lesson.level, lessonMap, completedLessonIds);

        return {
          id: lesson.id,
          level: lesson.level,
          title: lesson.title,
          type: lesson.type,
          xpReward: lesson.xpReward,
          isLocked,
          isCompleted,
        };
      });

      logger.info(`Fetched ${lessonsWithStatus.length} lessons for user ${userId}`);

      return lessonsWithStatus;
    } catch (error) {
      logger.error('Error fetching lessons:', error);
      throw error;
    }
  }

  /**
   * Get a specific lesson with full details including activities
   * @param lessonId - Lesson ID or level number
   * @param userId - User's ID to check progress
   * @returns Full lesson details with activities
   */
  async getLesson(lessonId: string, userId: string): Promise<LessonDetail> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Try to find lesson by ID first, then by level if ID is a number
      let lesson;
      
      // Check if lessonId is a number (level)
      const levelNumber = parseInt(lessonId, 10);
      if (!isNaN(levelNumber)) {
        lesson = await prisma.lesson.findUnique({
          where: { level: levelNumber },
        });
      } else {
        lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
        });
      }

      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      // Get user's progress for this lesson
      const progress = await prisma.progress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: lesson.id,
          },
        },
        select: {
          completed: true,
        },
      });

      const isCompleted = progress?.completed || false;

      // Check if lesson is locked by verifying if previous lesson is completed
      let isLocked = false;
      if (lesson.level > 1) {
        // Find the previous lesson
        const previousLesson = await prisma.lesson.findUnique({
          where: { level: lesson.level - 1 },
          select: { id: true },
        });

        if (previousLesson) {
          // Check if previous lesson is completed
          const previousProgress = await prisma.progress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: previousLesson.id,
              },
            },
            select: { completed: true },
          });

          isLocked = !previousProgress?.completed;
        }
      }

      logger.info(`Fetched lesson ${lesson.id} (level ${lesson.level}) for user ${userId}`);

      return {
        id: lesson.id,
        level: lesson.level,
        title: lesson.title,
        type: lesson.type,
        xpReward: lesson.xpReward,
        activities: lesson.content,
        mediaUrls: lesson.mediaUrls,
        isLocked,
        isCompleted,
      };
    } catch (error) {
      logger.error('Error fetching lesson:', error);
      throw error;
    }
  }

  /**
   * Complete a lesson and calculate XP earned
   * @param userId - User's ID
   * @param lessonId - Lesson ID
   * @param score - Score achieved (0-1)
   * @param timeTaken - Time taken in seconds
   * @returns Completion result with XP earned and level up info
   */
  async completeLesson(
    userId: string,
    lessonId: string,
    score: number,
    timeTaken: number
  ): Promise<CompletionResult> {
    try {
      // Fetch lesson
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
      });

      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      // Fetch user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if lesson is unlocked (verify previous lesson is completed)
      if (lesson.level > 1) {
        const previousLesson = await prisma.lesson.findUnique({
          where: { level: lesson.level - 1 },
          select: { id: true },
        });

        if (previousLesson) {
          const previousProgress = await prisma.progress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: previousLesson.id,
              },
            },
            select: { completed: true },
          });

          if (!previousProgress?.completed) {
            throw new Error('Cannot complete a locked lesson. Complete the previous lesson first.');
          }
        }
      }

      // Calculate XP earned
      const xpEarned = this.calculateXP(score, timeTaken, lesson.xpReward);

      // Check if progress record exists
      const existingProgress = await prisma.progress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
      });

      let progress;
      if (existingProgress) {
        // Update existing progress
        progress = await prisma.progress.update({
          where: {
            userId_lessonId: {
              userId,
              lessonId,
            },
          },
          data: {
            completed: true,
            score,
            xpEarned,
            timeTaken,
            attempts: existingProgress.attempts + 1,
            completedAt: new Date(),
          },
        });
      } else {
        // Create new progress record
        progress = await prisma.progress.create({
          data: {
            userId,
            lessonId,
            completed: true,
            score,
            xpEarned,
            timeTaken,
            attempts: 1,
            completedAt: new Date(),
          },
        });
      }

      // Update user's total XP
      const newTotalXp = user.totalXp + xpEarned;

      // Check for level up (every 1000 XP = 1 level)
      const newLevel = Math.floor(newTotalXp / 1000) + 1;
      const leveledUp = newLevel > user.currentLevel;

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalXp: newTotalXp,
          currentLevel: newLevel,
          lastActivityDate: new Date(),
        },
      });

      logger.info(
        `User ${userId} completed lesson ${lessonId} with score ${score}, earned ${xpEarned} XP${
          leveledUp ? `, leveled up to ${newLevel}` : ''
        }`
      );

      return {
        xpEarned,
        totalXp: newTotalXp,
        newLevel,
        leveledUp,
        progress: {
          completed: progress.completed,
          score: progress.score || 0,
          attempts: progress.attempts,
        },
      };
    } catch (error) {
      logger.error('Error completing lesson:', error);
      throw error;
    }
  }

  /**
   * Calculate XP earned based on score and time taken
   * @param score - Score achieved (0-1)
   * @param timeTaken - Time taken in seconds
   * @param baseXP - Base XP reward for the lesson
   * @returns Calculated XP
   * @private
   */
  private calculateXP(score: number, timeTaken: number, baseXP: number): number {
    // Base XP multiplied by score
    let xp = baseXP * score;

    // Time bonus: if completed quickly, give bonus
    // Assume optimal time is 5 minutes (300 seconds)
    const optimalTime = 300;
    if (timeTaken < optimalTime) {
      const timeBonus = 1 + (optimalTime - timeTaken) / optimalTime * 0.2; // Up to 20% bonus
      xp *= timeBonus;
    }

    // Perfect score bonus
    if (score >= 1.0) {
      xp *= 1.1; // 10% bonus for perfect score
    }

    // Round to nearest integer
    return Math.round(xp);
  }

  /**
   * Check if a lesson should be locked based on previous lesson completion
   * @param lessonLevel - Level of the lesson to check
   * @param lessonMap - Map of lesson level to lesson ID
   * @param completedLessonIds - Set of completed lesson IDs
   * @returns True if lesson is locked, false otherwise
   * @private
   */
  private checkLessonLock(
    lessonLevel: number,
    lessonMap: Map<number, string>,
    completedLessonIds: Set<string>
  ): boolean {
    // Level 1 is always unlocked
    if (lessonLevel === 1) {
      return false;
    }

    // Check if previous lesson is completed
    const previousLessonId = lessonMap.get(lessonLevel - 1);
    if (!previousLessonId) {
      // If previous lesson doesn't exist in the map, lock this lesson
      return true;
    }

    // Lesson is locked if previous lesson is not completed
    return !completedLessonIds.has(previousLessonId);
  }
}

// Export singleton instance
export const lessonService = new LessonService();
