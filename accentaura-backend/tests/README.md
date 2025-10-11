# Integration Tests Guide

## Overview

This directory contains comprehensive integration tests for the Accentaura Backend API. The tests cover all major endpoints and verify the complete request-response cycle including authentication, data validation, business logic, and error handling.

## Test Structure

```
tests/
├── setup.ts                      # Global test configuration
├── integration/
│   ├── auth.test.ts             # Authentication endpoints (21 tests)
│   ├── lesson.test.ts           # Lesson endpoints (12 tests)
│   ├── progress.test.ts         # Progress endpoints (14 tests)
│   ├── ai.test.ts               # AI service endpoints (11 tests)
│   ├── leaderboard.test.ts      # Leaderboard endpoints (13 tests)
│   └── interview.test.ts        # Interview endpoints (15 tests)
└── README.md                     # This file
```

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Test Databases

#### PostgreSQL
```bash
# Create test database
createdb accentaura_test

# Create test user with permissions
psql -c "CREATE USER test WITH PASSWORD 'test';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE accentaura_test TO test;"

# Grant schema permissions
psql accentaura_test -c "GRANT ALL ON SCHEMA public TO test;"
psql accentaura_test -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test;"
psql accentaura_test -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test;"
psql accentaura_test -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test;"
psql accentaura_test -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test;"

# Run migrations
DATABASE_URL="postgresql://test:test@localhost:5432/accentaura_test" npx prisma migrate deploy
```

#### MongoDB
```bash
# Ensure MongoDB is running
# The test database will be created automatically
mongosh --eval "db.version()"
```

#### Redis
```bash
# Ensure Redis is running
redis-cli ping
```

### 3. Configure Environment Variables

The test setup automatically configures test environment variables, but you can override them by creating a `.env.test` file:

```env
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://test:test@localhost:5432/accentaura_test
MONGODB_URI=mongodb://localhost:27017/accentaura_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-for-testing-only
GEMINI_API_KEY=test-gemini-api-key
FASTAPI_URL=http://localhost:8000
GOOGLE_CLIENT_ID=test-google-client-id
FACEBOOK_APP_ID=test-facebook-app-id
SENTRY_DSN=
DD_TRACE_ENABLED=false
```

## Running Tests

### Run All Integration Tests
```bash
npm test tests/integration
```

### Run Specific Test Suite
```bash
# Auth tests
npm test tests/integration/auth.test.ts

# Lesson tests
npm test tests/integration/lesson.test.ts

# Progress tests
npm test tests/integration/progress.test.ts

# AI tests
npm test tests/integration/ai.test.ts

# Leaderboard tests
npm test tests/integration/leaderboard.test.ts

# Interview tests
npm test tests/integration/interview.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/integration
```

### Run in Watch Mode (Development)
```bash
npm test -- --watch tests/integration
```

### Run Specific Test
```bash
npm test -- -t "should create a new user with valid credentials"
```

## Using Docker for Test Databases

### Create docker-compose.test.yml
```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: accentaura_test
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

  mongodb-test:
    image: mongo:6
    ports:
      - "27018:27017"
    volumes:
      - mongodb-test-data:/data/db

  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
    volumes:
      - redis-test-data:/data

volumes:
  postgres-test-data:
  mongodb-test-data:
  redis-test-data:
```

### Start Test Databases
```bash
docker-compose -f docker-compose.test.yml up -d
```

### Update Connection Strings
```env
DATABASE_URL=postgresql://test:test@localhost:5433/accentaura_test
MONGODB_URI=mongodb://localhost:27018/accentaura_test
REDIS_URL=redis://localhost:6380/1
```

### Stop Test Databases
```bash
docker-compose -f docker-compose.test.yml down
```

## Test Coverage

### Authentication Tests (21 tests)
- User signup with validation
- Email/password login
- OAuth login (Google, Facebook)
- Token refresh mechanism
- Token validation
- User profile retrieval
- Complete auth flow

### Lesson Tests (12 tests)
- Lesson list retrieval with pagination
- Specific lesson retrieval
- Lesson completion and XP award
- Lesson progression and unlocking
- Authentication enforcement

### Progress Tests (14 tests)
- User progress retrieval
- Progress updates (single and batch)
- XP awarding and level-up
- Streak management
- Progress synchronization

### AI Tests (11 tests)
- Chat interaction with AI
- Speech analysis with audio upload
- Text confidence analysis
- Rate limiting enforcement
- Error handling for external services

### Leaderboard Tests (13 tests)
- Top users retrieval
- User rank and percentile calculation
- Leaderboard caching
- Sorting and pagination
- Edge cases

### Interview Tests (15 tests)
- Interview session creation
- Interview submission (audio/video)
- Interview results retrieval
- Complete interview flow
- Performance metrics

## Troubleshooting

### Database Connection Errors

**Error:** `User 'test' was denied access on the database`

**Solution:**
```bash
# Grant all permissions to test user
psql accentaura_test -c "GRANT ALL ON SCHEMA public TO test;"
psql accentaura_test -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test;"
psql accentaura_test -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test;"
```

### Migration Errors

**Error:** `Migration failed`

**Solution:**
```bash
# Reset test database
dropdb accentaura_test
createdb accentaura_test
psql -c "GRANT ALL PRIVILEGES ON DATABASE accentaura_test TO test;"

# Run migrations again
DATABASE_URL="postgresql://test:test@localhost:5432/accentaura_test" npx prisma migrate deploy
```

### MongoDB Connection Errors

**Error:** `MongoServerError: Authentication failed`

**Solution:**
```bash
# For local development, MongoDB usually doesn't require authentication
# Update connection string to remove credentials
MONGODB_URI=mongodb://localhost:27017/accentaura_test
```

### Redis Connection Errors

**Error:** `Redis connection refused`

**Solution:**
```bash
# Start Redis
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7
```

### Test Timeout Errors

**Error:** `Timeout - Async callback was not invoked within the 5000 ms timeout`

**Solution:**
The Jest configuration already sets `testTimeout: 30000`. If you still see timeouts:
```bash
# Increase timeout for specific test
jest.setTimeout(60000);
```

### File Upload Errors

**Error:** `ENOENT: no such file or directory`

**Solution:**
Mock files are created and cleaned up automatically. Ensure the test has write permissions:
```bash
chmod 755 tests/integration
```

## Best Practices

### 1. Test Isolation
- Each test is independent
- Database is cleaned after each test
- No shared state between tests

### 2. Descriptive Test Names
```typescript
it('should return 401 without authentication', async () => {
  // Test implementation
});
```

### 3. Arrange-Act-Assert Pattern
```typescript
// Arrange
const user = await createTestUser();

// Act
const response = await request(app).get('/v1/profile');

// Assert
expect(response.status).toBe(200);
```

### 4. Mock External Services
```typescript
// Mock FastAPI responses
mockedAxios.post.mockResolvedValueOnce({
  data: { response: 'AI response' }
});
```

### 5. Clean Up Resources
```typescript
afterEach(async () => {
  // Clean up mock files
  if (fs.existsSync(mockFilePath)) {
    fs.unlinkSync(mockFilePath);
  }
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: accentaura_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/accentaura_test
      
      - name: Run integration tests
        run: npm test tests/integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/accentaura_test
          MONGODB_URI: mongodb://localhost:27017/accentaura_test
          REDIS_URL: redis://localhost:6379/1
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test logs for specific error messages
3. Ensure all prerequisites are met
4. Verify database connections and permissions
