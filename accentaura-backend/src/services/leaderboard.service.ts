import { PrismaClient } from '@prisma/client';
import { cacheService, LeaderboardData, LeaderboardEntry } from './cache.service';
import logger from '../config/logger';

const prisma = new PrismaClient();

/**
 * User rank information with percentile
 */
export interface UserRank {
  rank: number;
  totalUsers: number;
  percentile: number;
}

/**
 * LeaderboardService class for managing leaderboard operations
 * Implements caching and efficient ranking queries
 */
export class LeaderboardService {
  /**
   * Get leaderboard with top users ranked by total XP
   * Uses caching to reduce database load
   * 
   * @param limit - Number of top users to return (default: 100)
   * @returns Leaderboard data with entries and last updated timestamp
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardData> {
    try {
      // Try to get from cache first
      const cached = await cacheService.getCachedLeaderboard();
      if (cached) {
        logger.info('Returning cached leaderboard', { entries: cached.entries.length });
        return cached;
      }

      // Cache miss - fetch from database
      logger.info('Fetching leaderboard from database', { limit });

      const topUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          totalXp: true,
          streak: true,
        },
        orderBy: {
          totalXp: 'desc',
        },
        take: limit,
      });

      // Transform to leaderboard entries with rank
      const entries: LeaderboardEntry[] = topUsers.map((user, index) => ({
        userId: user.id,
        username: user.name || 'Anonymous',
        avatarUrl: user.avatarUrl,
        totalXp: user.totalXp,
        rank: index + 1,
        streak: user.streak,
      }));

      const leaderboardData: LeaderboardData = {
        entries,
        lastUpdated: new Date(),
      };

      // Cache the result
      await cacheService.cacheLeaderboard(leaderboardData);

      logger.info('Leaderboard fetched and cached', {
        entries: entries.length,
        topXp: entries[0]?.totalXp || 0,
      });

      return leaderboardData;
    } catch (error) {
      logger.error('Failed to get leaderboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get user's rank with percentile calculation
   * 
   * @param userId - User ID to get rank for
   * @returns User rank information including rank, total users, and percentile
   */
  async getUserRank(userId: string): Promise<UserRank> {
    try {
      logger.info('Fetching user rank', { userId });

      // Get user's XP
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalXp: true },
      });

      if (!user) {
        logger.warn('User not found for rank calculation', { userId });
        throw new Error('User not found');
      }

      // Count users with higher XP (this gives us the rank - 1)
      const usersWithHigherXp = await prisma.user.count({
        where: {
          totalXp: {
            gt: user.totalXp,
          },
        },
      });

      const rank = usersWithHigherXp + 1;

      // Get total number of users
      const totalUsers = await prisma.user.count();

      // Calculate percentile (what percentage of users this user is better than)
      const percentile = totalUsers > 1 
        ? ((totalUsers - rank) / (totalUsers - 1)) * 100 
        : 100;

      const userRank: UserRank = {
        rank,
        totalUsers,
        percentile: Math.round(percentile * 100) / 100, // Round to 2 decimal places
      };

      logger.info('User rank calculated', {
        userId,
        rank,
        totalUsers,
        percentile: userRank.percentile,
        userXp: user.totalXp,
      });

      return userRank;
    } catch (error) {
      logger.error('Failed to get user rank', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Invalidate leaderboard cache
   * Should be called when user XP is updated
   * 
   * @param userId - User ID whose XP was updated (for logging)
   */
  async invalidateCache(userId?: string): Promise<void> {
    try {
      await cacheService.invalidateLeaderboard();
      
      logger.info('Leaderboard cache invalidated', {
        userId,
        reason: 'XP update',
      });
    } catch (error) {
      logger.error('Failed to invalidate leaderboard cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
