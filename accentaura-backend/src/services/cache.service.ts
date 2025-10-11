import { getRedisClient } from '../config/redis';
import logger from '../config/logger';

/**
 * Leaderboard data structure for caching
 */
export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalXp: number;
  rank: number;
  streak: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

/**
 * CacheService class for managing Redis cache operations
 * Provides type-safe caching with TTL support and pattern-based invalidation
 */
export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes in seconds
  private readonly LEADERBOARD_KEY = 'leaderboard:top100';
  private readonly LEADERBOARD_TTL = 300; // 5 minutes

  /**
   * Get a value from cache with type safety
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(key);

      if (!value) {
        logger.debug('Cache miss', { key });
        return null;
      }

      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds (optional, defaults to 5 minutes)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      const expirySeconds = ttl ?? this.DEFAULT_TTL;

      await client.setEx(key, expirySeconds, serialized);

      logger.debug('Cache set', { key, ttl: expirySeconds });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete a specific key from cache
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);

      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Redis pattern (e.g., 'user:*', 'lesson:*')
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      
      // Use SCAN to find matching keys (safer than KEYS for production)
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length > 0) {
        await client.del(keys);
        logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
      } else {
        logger.debug('No cache keys found for pattern', { pattern });
      }
    } catch (error) {
      logger.error('Cache invalidate error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cache leaderboard data
   * @param data - Leaderboard data to cache
   * @param ttl - Optional TTL override (defaults to 5 minutes)
   */
  async cacheLeaderboard(data: LeaderboardData, ttl?: number): Promise<void> {
    try {
      const expirySeconds = ttl ?? this.LEADERBOARD_TTL;
      await this.set(this.LEADERBOARD_KEY, data, expirySeconds);

      logger.info('Leaderboard cached', {
        entries: data.entries.length,
        ttl: expirySeconds,
      });
    } catch (error) {
      logger.error('Failed to cache leaderboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get cached leaderboard data
   * @returns Leaderboard data or null if not cached
   */
  async getCachedLeaderboard(): Promise<LeaderboardData | null> {
    try {
      const data = await this.get<LeaderboardData>(this.LEADERBOARD_KEY);

      if (data) {
        logger.info('Leaderboard retrieved from cache', {
          entries: data.entries.length,
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get cached leaderboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Invalidate cached leaderboard data
   */
  async invalidateLeaderboard(): Promise<void> {
    try {
      await this.del(this.LEADERBOARD_KEY);
      logger.info('Leaderboard cache invalidated');
    } catch (error) {
      logger.error('Failed to invalidate leaderboard cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
