import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/accentaura_test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/accentaura_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.FASTAPI_URL = 'http://localhost:8000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
process.env.SENTRY_DSN = ''; // Disable Sentry in tests
process.env.DD_TRACE_ENABLED = 'false'; // Disable DataDog in tests

const prisma = new PrismaClient();

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Global test setup
beforeAll(async () => {
  // Wait a bit for connections to stabilize
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Clean up before each test (not after)
beforeEach(async () => {
  // Clean up test database before each test
  await cleanDatabase();
  
  // Clear all mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Global test teardown
afterAll(async () => {
  // Final cleanup
  await cleanDatabase();
  
  await prisma.$disconnect();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Helper function to clean database
async function cleanDatabase() {
  try {
    // Clean PostgreSQL in correct order (respecting foreign keys)
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.progress.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.user.deleteMany({});

    // Clean MongoDB
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  } catch (error) {
    console.error('Database cleanup error:', error);
    throw error;
  }
}

export { prisma, cleanDatabase };
