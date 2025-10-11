# Configuration Module

This directory contains all configuration files for the Accentaura Backend API.

## Environment Variables (`env.ts`)

The `env.ts` module provides type-safe, validated environment variable access throughout the application.

### Features

- **Automatic Validation**: All environment variables are validated on application startup using Zod schemas
- **Type Safety**: Full TypeScript support with autocomplete
- **Clear Error Messages**: Detailed validation errors if configuration is incorrect
- **Helper Functions**: Utility functions for common environment checks

### Usage

```typescript
import { env, isProduction, isDevelopment, isS3Configured } from './config/env';

// Access validated environment variables
const port = env.PORT; // Type: number
const dbUrl = env.DATABASE_URL; // Type: string
const nodeEnv = env.NODE_ENV; // Type: 'development' | 'production' | 'test' | 'staging'

// Use helper functions
if (isProduction()) {
  // Production-specific logic
}

if (isS3Configured()) {
  // Use S3 for file storage
}
```

### Required Environment Variables

The following environment variables are **required** and must be set in your `.env` file:

- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `JWT_REFRESH_SECRET` - Refresh token signing secret (min 32 characters)
- `GEMINI_API_KEY` - Google Gemini API key
- `FASTAPI_URL` - FastAPI microservice URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `FACEBOOK_APP_ID` - Facebook OAuth app ID

### Optional Environment Variables

These variables have defaults or are optional:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (default: 'development')
- `AWS_ACCESS_KEY_ID` - AWS access key (optional)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (optional)
- `AWS_REGION` - AWS region (default: 'us-east-1')
- `AWS_S3_BUCKET` - S3 bucket name (optional)
- `SENTRY_DSN` - Sentry error tracking DSN (optional)
- `DATADOG_API_KEY` - DataDog monitoring API key (optional)

### Validation on Startup

The environment validation runs automatically when the `env` module is imported. If validation fails, the application will exit with a detailed error message:

```
❌ Environment variable validation failed:

  - JWT_SECRET: String must contain at least 32 character(s)
  - DATABASE_URL: DATABASE_URL must be a valid PostgreSQL connection string

Please check your .env file and ensure all required variables are set correctly.
Refer to .env.example for the expected format.
```

### Helper Functions

#### `isProduction()`
Returns `true` if `NODE_ENV` is set to `'production'`

#### `isDevelopment()`
Returns `true` if `NODE_ENV` is set to `'development'`

#### `isTest()`
Returns `true` if `NODE_ENV` is set to `'test'`

#### `isS3Configured()`
Returns `true` if all AWS S3 credentials are configured

#### `isMonitoringConfigured()`
Returns `true` if Sentry or DataDog is configured

## Database Configuration (`db.ts`)

PostgreSQL connection using Prisma ORM with connection pooling and logging.

### Usage

```typescript
import prisma, { connectDatabase, disconnectDatabase } from './config/db';

// Connect to database
await connectDatabase();

// Use Prisma client
const users = await prisma.user.findMany();

// Disconnect (for graceful shutdown)
await disconnectDatabase();
```

## MongoDB Configuration (`mongo.ts`)

MongoDB connection using Mongoose with automatic retry logic.

### Usage

```typescript
import { connectMongoDB, disconnectMongoDB, isMongoDBConnected } from './config/mongo';

// Connect to MongoDB
await connectMongoDB();

// Check connection status
if (isMongoDBConnected()) {
  // Use MongoDB models
}

// Disconnect
await disconnectMongoDB();
```

## Redis Configuration (`redis.ts`)

Redis connection with reconnection logic and health checks.

### Usage

```typescript
import { connectRedis, getRedisClient, pingRedis, disconnectRedis } from './config/redis';

// Connect to Redis
await connectRedis();

// Get client instance
const redis = getRedisClient();
await redis.set('key', 'value');

// Health check
const isHealthy = await pingRedis();

// Disconnect
await disconnectRedis();
```

## Logger Configuration (`logger.ts`)

Basic logging utility (will be enhanced with Winston in task 3.2).

### Usage

```typescript
import logger from './config/logger';

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', error);
logger.warn('High memory usage detected');
logger.debug('Request details', { method: 'GET', path: '/api/users' });
```

## Best Practices

1. **Always import `env` instead of using `process.env` directly** - This ensures type safety and validation
2. **Import configuration modules early** - Import in `server.ts` before other modules to catch configuration errors early
3. **Use helper functions** - Use `isProduction()`, `isDevelopment()`, etc. instead of checking `NODE_ENV` directly
4. **Never commit `.env` files** - Keep secrets in `.env` and use `.env.example` as a template
5. **Validate early** - The env validation happens on import, so any configuration errors are caught at startup

## Troubleshooting

### "Environment variable validation failed"

Check your `.env` file and ensure all required variables are set. Compare with `.env.example` to see the expected format.

### "Cannot find module './logger'"

This is a TypeScript language server issue. Run `npm run build` to verify the code compiles correctly.

### Circular dependency warnings

The configuration modules are designed to avoid circular dependencies. The `env.ts` module uses `console` directly instead of importing `logger` to prevent circular imports.
