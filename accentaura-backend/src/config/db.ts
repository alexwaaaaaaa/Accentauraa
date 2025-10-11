import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { env, isDevelopment } from './env';

// Prisma Client with connection pooling configuration
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

// Log queries in development
if (isDevelopment()) {
  prisma.$on('query', (e: any) => {
    logger.debug('Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log errors
prisma.$on('error', (e: any) => {
  logger.error('Prisma error:', e);
});

// Log warnings
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma warning:', e);
});

// Test database connection
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL:', error);
    throw error;
  }
}

export default prisma;
