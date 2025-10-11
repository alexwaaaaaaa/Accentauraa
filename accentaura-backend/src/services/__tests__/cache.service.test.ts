import { CacheService, LeaderboardData } from '../cache.service';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';

// Mock dependencies
jest.mock('../../config/redis');
jest.mock('../../config/logger');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    // Create new instance for each test
    cacheService = new CacheService();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const testData = { id: '123', name: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get<typeof testData>('test:key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
      expect(logger.debug).toHaveBeenCalledWith('Cache hit', { key: 'test:key' });
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent:key');

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('Cache miss', { key: 'nonexistent:key' });
    });

    it('should return null and log error on Redis error', async () => {
      const error = new Error('Redis connection error');
      mockRedisClient.get.mockRejectedValue(error);

      const result = await cacheService.get('error:key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Cache get error', {
        key: 'error:key',
        error: 'Redis connection error',
      });
    });

    it('should handle type safety with generic types', async () => {
      interface User {
        id: string;
        email: string;
      }

      const user: User = { id: '1', email: 'test@example.com' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(user));

      const result = await cacheService.get<User>('user:1');

      expect(result).toEqual(user);
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const testData = { id: '123', name: 'Test' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set('test:key', testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        300, // Default TTL
        JSON.stringify(testData)
      );
      expect(logger.debug).toHaveBeenCalledWith('Cache set', { key: 'test:key', ttl: 300 });
    });

    it('should set value with custom TTL', async () => {
      const testData = { id: '123', name: 'Test' };
      const customTTL = 600;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set('test:key', testData, customTTL);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        customTTL,
        JSON.stringify(testData)
      );
      expect(logger.debug).toHaveBeenCalledWith('Cache set', { key: 'test:key', ttl: customTTL });
    });

    it('should throw error on Redis error', async () => {
      const error = new Error('Redis write error');
      mockRedisClient.setEx.mockRejectedValue(error);

      await expect(cacheService.set('test:key', { data: 'test' })).rejects.toThrow('Redis write error');
      expect(logger.error).toHaveBeenCalledWith('Cache set error', {
        key: 'test:key',
        ttl: undefined,
        error: 'Redis write error',
      });
    });

    it('should serialize complex objects', async () => {
      const complexData = {
        user: { id: '1', name: 'John' },
        items: [1, 2, 3],
        metadata: { created: new Date().toISOString() },
      };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set('complex:key', complexData, 60);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'complex:key',
        60,
        JSON.stringify(complexData)
      );
    });
  });

  describe('del', () => {
    it('should delete key successfully', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.del('test:key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
      expect(logger.debug).toHaveBeenCalledWith('Cache delete', { key: 'test:key' });
    });

    it('should throw error on Redis error', async () => {
      const error = new Error('Redis delete error');
      mockRedisClient.del.mockRejectedValue(error);

      await expect(cacheService.del('test:key')).rejects.toThrow('Redis delete error');
      expect(logger.error).toHaveBeenCalledWith('Cache delete error', {
        key: 'test:key',
        error: 'Redis delete error',
      });
    });
  });

  describe('invalidate', () => {
    it('should invalidate keys matching pattern', async () => {
      const matchingKeys = ['user:1', 'user:2', 'user:3'];
      
      // Mock SCAN to return keys in one iteration
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: matchingKeys,
      });
      mockRedisClient.del.mockResolvedValue(matchingKeys.length);

      await cacheService.invalidate('user:*');

      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: 'user:*',
        COUNT: 100,
      });
      expect(mockRedisClient.del).toHaveBeenCalledWith(matchingKeys);
      expect(logger.info).toHaveBeenCalledWith('Cache invalidated', {
        pattern: 'user:*',
        keysDeleted: 3,
      });
    });

    it('should handle multiple SCAN iterations', async () => {
      // Mock SCAN to return keys in multiple iterations
      mockRedisClient.scan
        .mockResolvedValueOnce({
          cursor: 1,
          keys: ['user:1', 'user:2'],
        })
        .mockResolvedValueOnce({
          cursor: 0,
          keys: ['user:3', 'user:4'],
        });
      mockRedisClient.del.mockResolvedValue(4);

      await cacheService.invalidate('user:*');

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['user:1', 'user:2', 'user:3', 'user:4']);
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: [],
      });

      await cacheService.invalidate('nonexistent:*');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('No cache keys found for pattern', {
        pattern: 'nonexistent:*',
      });
    });

    it('should throw error on Redis error', async () => {
      const error = new Error('Redis scan error');
      mockRedisClient.scan.mockRejectedValue(error);

      await expect(cacheService.invalidate('test:*')).rejects.toThrow('Redis scan error');
      expect(logger.error).toHaveBeenCalledWith('Cache invalidate error', {
        pattern: 'test:*',
        error: 'Redis scan error',
      });
    });
  });

  describe('cacheLeaderboard', () => {
    it('should cache leaderboard with default TTL', async () => {
      const leaderboardData: LeaderboardData = {
        entries: [
          {
            userId: '1',
            username: 'user1',
            avatarUrl: 'https://example.com/avatar1.jpg',
            totalXp: 1000,
            rank: 1,
            streak: 5,
          },
          {
            userId: '2',
            username: 'user2',
            avatarUrl: null,
            totalXp: 900,
            rank: 2,
            streak: 3,
          },
        ],
        lastUpdated: new Date(),
      };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheLeaderboard(leaderboardData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'leaderboard:top100',
        300,
        JSON.stringify(leaderboardData)
      );
      expect(logger.info).toHaveBeenCalledWith('Leaderboard cached', {
        entries: 2,
        ttl: 300,
      });
    });

    it('should cache leaderboard with custom TTL', async () => {
      const leaderboardData: LeaderboardData = {
        entries: [],
        lastUpdated: new Date(),
      };
      const customTTL = 600;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheLeaderboard(leaderboardData, customTTL);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'leaderboard:top100',
        customTTL,
        JSON.stringify(leaderboardData)
      );
      expect(logger.info).toHaveBeenCalledWith('Leaderboard cached', {
        entries: 0,
        ttl: customTTL,
      });
    });

    it('should throw error on cache failure', async () => {
      const leaderboardData: LeaderboardData = {
        entries: [],
        lastUpdated: new Date(),
      };
      const error = new Error('Cache write failed');
      mockRedisClient.setEx.mockRejectedValue(error);

      await expect(cacheService.cacheLeaderboard(leaderboardData)).rejects.toThrow('Cache write failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to cache leaderboard', {
        error: 'Cache write failed',
      });
    });
  });

  describe('getCachedLeaderboard', () => {
    it('should return cached leaderboard data', async () => {
      const testDate = new Date('2025-10-10T12:00:00.000Z');
      const leaderboardData: LeaderboardData = {
        entries: [
          {
            userId: '1',
            username: 'user1',
            avatarUrl: 'https://example.com/avatar1.jpg',
            totalXp: 1000,
            rank: 1,
            streak: 5,
          },
        ],
        lastUpdated: testDate,
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(leaderboardData));

      const result = await cacheService.getCachedLeaderboard();

      // Date gets serialized as string in JSON, so we need to compare accordingly
      expect(result?.entries).toEqual(leaderboardData.entries);
      expect(result?.lastUpdated).toBe(testDate.toISOString());
      expect(mockRedisClient.get).toHaveBeenCalledWith('leaderboard:top100');
      expect(logger.info).toHaveBeenCalledWith('Leaderboard retrieved from cache', {
        entries: 1,
      });
    });

    it('should return null when leaderboard not cached', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getCachedLeaderboard();

      expect(result).toBeNull();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should return null and log error on failure', async () => {
      const error = new Error('Redis read error');
      mockRedisClient.get.mockRejectedValue(error);

      const result = await cacheService.getCachedLeaderboard();

      expect(result).toBeNull();
      // The error is logged by the get() method, not getCachedLeaderboard()
      expect(logger.error).toHaveBeenCalledWith('Cache get error', {
        key: 'leaderboard:top100',
        error: 'Redis read error',
      });
    });
  });

  describe('invalidateLeaderboard', () => {
    it('should invalidate leaderboard cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.invalidateLeaderboard();

      expect(mockRedisClient.del).toHaveBeenCalledWith('leaderboard:top100');
      expect(logger.info).toHaveBeenCalledWith('Leaderboard cache invalidated');
    });

    it('should throw error on invalidation failure', async () => {
      const error = new Error('Redis delete error');
      mockRedisClient.del.mockRejectedValue(error);

      await expect(cacheService.invalidateLeaderboard()).rejects.toThrow('Redis delete error');
      expect(logger.error).toHaveBeenCalledWith('Failed to invalidate leaderboard cache', {
        error: 'Redis delete error',
      });
    });
  });
});
