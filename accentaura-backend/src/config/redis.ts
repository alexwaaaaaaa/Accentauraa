import { createClient, RedisClientType } from 'redis';
import logger from './logger';
import { env } from './env';

let redisClient: RedisClientType | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

/**
 * Initialize Redis connection with error handling and reconnection logic
 */
export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (redisClient && redisClient.isOpen) {
          clearInterval(checkInterval);
          resolve(redisClient);
        } else if (!isConnecting) {
          clearInterval(checkInterval);
          reject(new Error('Redis connection failed'));
        }
      }, 100);
    });
  }

  isConnecting = true;

  try {
    const redisUrl = env.REDIS_URL;
    
    logger.info('Connecting to Redis...', { url: redisUrl.replace(/:[^:]*@/, ':****@') });

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            logger.error('Redis max reconnection attempts reached', { retries });
            return new Error('Redis max reconnection attempts exceeded');
          }
          
          const delay = Math.min(retries * 1000, RECONNECT_DELAY);
          logger.warn('Redis reconnecting...', { attempt: retries, delayMs: delay });
          return delay;
        },
        connectTimeout: 10000, // 10 seconds
      },
    });

    // Error event handler
    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message, stack: err.stack });
    });

    // Connection event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      reconnectAttempts = 0;
    });

    redisClient.on('reconnecting', () => {
      reconnectAttempts++;
      logger.warn('Redis client reconnecting...', { attempt: reconnectAttempts });
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection closed');
    });

    // Connect to Redis
    await redisClient.connect();
    
    logger.info('Redis connected successfully');
    isConnecting = false;
    
    return redisClient;
  } catch (error) {
    isConnecting = false;
    logger.error('Failed to connect to Redis', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Get Redis client instance
 * @throws Error if Redis is not connected
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client is not connected. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.isOpen;
}

/**
 * Disconnect from Redis gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    try {
      logger.info('Disconnecting from Redis...');
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Force close if quit fails
      if (redisClient) {
        await redisClient.disconnect();
        redisClient = null;
      }
    }
  }
}

/**
 * Ping Redis to check connection health
 */
export async function pingRedis(): Promise<boolean> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis ping failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

export default {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  disconnectRedis,
  pingRedis,
};
