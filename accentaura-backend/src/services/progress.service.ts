import prisma from '../config/db';
import logger from '../config/logger';
import { NotFoundError, ConflictError } from '../utils/errors.util';

/**
 * User Progress Interface
 * Complete progress data for a user
 */
export interface UserProgress {
  currentLevel: number;
  totalXp: number;
  streak: number;
  coins: number;
  lastActivityDate: Date | null;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    earnedAt: Date;
  }>;
  lessonProgress: Array<{
    lessonId: string;
    level: number;
    completed: boolean;
    score: number | null;
    xpEarned: number;
    attempts: number;
    completedAt: Date | null;
  }>;
}

/**
 * Progress Update Interface
 * Single progress update from mobile app
 */
export interface ProgressUpdate {
  lessonId: string;
  completed: boolean;
  score: number;
  timeTaken?: number;
  timestamp: Date;
}

/**
 * Sync Result Interface
 * Result of batch progress sync
 */
export interface SyncResult {
  synced: number;
  failed: number;
  progress: UserProgress;
}

/**
 * XP Award Result Interface
 */
export interface XPResult {
  totalXp: number;
  currentLevel: number;
  leveledUp: boolean;
  previousLevel?: number;
}

/**
 * Streak Update Result Interface
 */
export interface StreakResult {
  streak: number;
  lastActivityDate: Date;
  streakBroken: boolean;
}

/**
 * ProgressService Class
 * Handles all progress tracking operations
 */
export class ProgressService {
  /**
   * Get complete user progress data
   * @param userId - User's ID
   * @returns Complete user progress including badges and lesson progress
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      // Fetch user with badges
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            include: {
              badge: true,
            },
            orderBy: {
              earnedAt: 'desc',
            },
          },
          progress: {
            include: {
              lesson: {
                select: {
                  level: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Map badges
      const badges = user.badges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        earnedAt: ub.earnedAt,
      }));

      // Map lesson progress
      const lessonProgress = user.progress.map(p => ({
        lessonId: p.lessonId,
        level: p.lesson.level,
        completed: p.completed,
        score: p.score,
        xpEarned: p.xpEarned,
        attempts: p.attempts,
        completedAt: p.completedAt,
      }));

      logger.info(`Fetched progress for user ${userId}`);

      return {
        currentLevel: user.currentLevel,
        totalXp: user.totalXp,
        streak: user.streak,
        coins: user.coins,
        lastActivityDate: user.lastActivityDate,
        badges,
        lessonProgress,
      };
    } catch (error) {
      logger.error('Error fetching user progress:', error);
      throw error;
    }
  }

  /**
   * Sync progress updates from mobile app (batch updates)
   * @param userId - User's ID
   * @param updates - Array of progress updates
   * @returns Sync result with updated progress
   */
  async syncProgress(userId: string, updates: ProgressUpdate[]): Promise<SyncResult> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      let synced = 0;
      let failed = 0;

      // Process each update sequentially to maintain data consistency
      for (const update of updates) {
        try {
          // Verify lesson exists
          const lesson = await prisma.lesson.findUnique({
            where: { id: update.lessonId },
          });

          if (!lesson) {
            logger.warn(`Lesson ${update.lessonId} not found, skipping update`);
            failed++;
            continue;
          }

          // Calculate XP earned
          const xpEarned = Math.round(lesson.xpReward * update.score);

          // Check if progress record exists
          const existingProgress = await prisma.progress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: update.lessonId,
              },
            },
          });

          if (existingProgress) {
            // Server wins for completed lessons - don't overwrite if already completed
            if (existingProgress.completed && !update.completed) {
              logger.info(
                `Skipping update for lesson ${update.lessonId} - already completed on server`
              );
              synced++;
              continue;
            }

            // Update existing progress
            await prisma.progress.update({
              where: {
                userId_lessonId: {
                  userId,
                  lessonId: update.lessonId,
                },
              },
              data: {
                completed: update.completed,
                score: update.score,
                xpEarned,
                timeTaken: update.timeTaken,
                attempts: existingProgress.attempts + 1,
                completedAt: update.completed ? update.timestamp : existingProgress.completedAt,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new progress record
            await prisma.progress.create({
              data: {
                userId,
                lessonId: update.lessonId,
                completed: update.completed,
                score: update.score,
                xpEarned,
                timeTaken: update.timeTaken,
                attempts: 1,
                completedAt: update.completed ? update.timestamp : null,
              },
            });
          }

          // Award XP if lesson is completed
          if (update.completed) {
            await this.awardXP(userId, xpEarned, `lesson_${update.lessonId}`);
          }

          synced++;
        } catch (error) {
          logger.error(`Error syncing progress for lesson ${update.lessonId}:`, error);
          failed++;
        }
      }

      // Update streak after all progress updates
      await this.updateStreak(userId);

      // Check for badge eligibility
      const eligibleBadges = await this.checkBadgeEligibility(userId);
      for (const badgeId of eligibleBadges) {
        try {
          await this.awardBadge(userId, badgeId);
        } catch (error) {
          // Badge might already be awarded, continue
          logger.debug(`Could not award badge ${badgeId}:`, error);
        }
      }

      // Fetch updated progress
      const progress = await this.getUserProgress(userId);

      logger.info(`Synced ${synced} progress updates for user ${userId}, ${failed} failed`);

      return {
        synced,
        failed,
        progress,
      };
    } catch (error) {
      logger.error('Error syncing progress:', error);
      throw error;
    }
  }

  /**
   * Award XP to user with level-up logic
   * @param userId - User's ID
   * @param amount - Amount of XP to award
   * @param source - Source of XP (for logging)
   * @returns XP result with level-up information
   */
  async awardXP(userId: string, amount: number, source: string): Promise<XPResult> {
    try {
      // Fetch user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const previousLevel = user.currentLevel;
      const newTotalXp = user.totalXp + amount;

      // Check for level up
      const levelUpResult = this.checkLevelUp(newTotalXp, previousLevel);

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalXp: newTotalXp,
          currentLevel: levelUpResult.newLevel,
          lastActivityDate: new Date(),
        },
      });

      logger.info(
        `Awarded ${amount} XP to user ${userId} from ${source}. Total: ${newTotalXp}${
          levelUpResult.leveledUp ? `, leveled up to ${levelUpResult.newLevel}` : ''
        }`
      );

      return {
        totalXp: newTotalXp,
        currentLevel: levelUpResult.newLevel,
        leveledUp: levelUpResult.leveledUp,
        previousLevel: levelUpResult.leveledUp ? previousLevel : undefined,
      };
    } catch (error) {
      logger.error('Error awarding XP:', error);
      throw error;
    }
  }

  /**
   * Update user's streak based on last activity date
   * @param userId - User's ID
   * @returns Streak result with updated streak count
   */
  async updateStreak(userId: string): Promise<StreakResult> {
    try {
      // Fetch user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const now = new Date();
      const lastActivity = user.lastActivityDate;

      let newStreak = user.streak;
      let streakBroken = false;

      if (!lastActivity) {
        // First activity ever
        newStreak = 1;
      } else {
        // Calculate days difference
        const daysDifference = this.calculateDaysDifference(lastActivity, now);

        if (daysDifference === 0) {
          // Same day - no change to streak
          newStreak = user.streak;
        } else if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak = user.streak + 1;
        } else {
          // Missed a day - reset streak
          newStreak = 1;
          streakBroken = user.streak > 0;
        }
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: newStreak,
          lastActivityDate: now,
        },
      });

      logger.info(
        `Updated streak for user ${userId}: ${newStreak}${streakBroken ? ' (streak broken)' : ''}`
      );

      return {
        streak: newStreak,
        lastActivityDate: now,
        streakBroken,
      };
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }

  /**
   * Award a badge to a user
   * @param userId - User's ID
   * @param badgeId - Badge ID to award
   */
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify badge exists
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
      });

      if (!badge) {
        throw new NotFoundError('Badge not found');
      }

      // Check if user already has this badge
      const existingUserBadge = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId,
          },
        },
      });

      if (existingUserBadge) {
        throw new ConflictError('User already has this badge');
      }

      // Award badge
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId,
        },
      });

      logger.info(`Awarded badge ${badge.name} to user ${userId}`);
    } catch (error) {
      logger.error('Error awarding badge:', error);
      throw error;
    }
  }

  /**
   * Check if user should level up based on total XP
   * @param totalXp - User's total XP
   * @param currentLevel - User's current level
   * @returns Level up result
   * @private
   */
  private checkLevelUp(
    totalXp: number,
    currentLevel: number
  ): { newLevel: number; leveledUp: boolean } {
    // Level formula: Every 1000 XP = 1 level
    // Level 1: 0-999 XP
    // Level 2: 1000-1999 XP
    // Level 3: 2000-2999 XP, etc.
    const newLevel = Math.floor(totalXp / 1000) + 1;
    const leveledUp = newLevel > currentLevel;

    return {
      newLevel,
      leveledUp,
    };
  }

  /**
   * Check which badges the user is eligible for
   * @param userId - User's ID
   * @returns Array of badge IDs the user is eligible for
   * @private
   */
  private async checkBadgeEligibility(userId: string): Promise<string[]> {
    try {
      // Fetch user with progress and current badges
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          progress: {
            where: {
              completed: true,
            },
          },
          badges: {
            select: {
              badgeId: true,
            },
          },
        },
      });

      if (!user) {
        return [];
      }

      // Get all badges
      const allBadges = await prisma.badge.findMany();

      // Get badge IDs user already has
      const userBadgeIds = new Set(user.badges.map(ub => ub.badgeId));

      // Check eligibility for each badge
      const eligibleBadgeIds: string[] = [];

      for (const badge of allBadges) {
        // Skip if user already has this badge
        if (userBadgeIds.has(badge.id)) {
          continue;
        }

        // Parse requirement and check eligibility
        const isEligible = this.checkBadgeRequirement(badge.requirement, user);

        if (isEligible) {
          eligibleBadgeIds.push(badge.id);
        }
      }

      return eligibleBadgeIds;
    } catch (error) {
      logger.error('Error checking badge eligibility:', error);
      return [];
    }
  }

  /**
   * Check if user meets a specific badge requirement
   * @param requirement - Badge requirement string (e.g., "complete_10_lessons", "reach_level_5")
   * @param user - User object with progress data
   * @returns True if requirement is met
   * @private
   */
  private checkBadgeRequirement(requirement: string, user: any): boolean {
    // Parse requirement format: "action_value" or "action_value_type"
    const parts = requirement.split('_');

    if (parts.length < 2) {
      logger.warn(`Invalid badge requirement format: ${requirement}`);
      return false;
    }

    const action = parts[0];
    const value = parseInt(parts[1], 10);

    if (isNaN(value)) {
      logger.warn(`Invalid badge requirement value: ${requirement}`);
      return false;
    }

    switch (action) {
      case 'complete':
        // complete_10_lessons
        const completedLessons = user.progress.filter((p: any) => p.completed).length;
        return completedLessons >= value;

      case 'reach':
        // reach_level_5
        if (parts[2] === 'level') {
          return user.currentLevel >= value;
        }
        return false;

      case 'earn':
        // earn_5000_xp
        if (parts[2] === 'xp') {
          return user.totalXp >= value;
        }
        return false;

      case 'streak':
        // streak_7_days
        return user.streak >= value;

      default:
        logger.warn(`Unknown badge requirement action: ${action}`);
        return false;
    }
  }

  /**
   * Calculate the number of days between two dates
   * @param date1 - First date
   * @param date2 - Second date
   * @returns Number of days difference
   * @private
   */
  private calculateDaysDifference(date1: Date, date2: Date): number {
    // Reset time to midnight for accurate day comparison
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);

    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

// Export singleton instance
export const progressService = new ProgressService();
