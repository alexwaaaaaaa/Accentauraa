# Implementation Plan

## Note
The backend does not exist yet. All tasks below need to be implemented from scratch. The mobile app (Flutter) is already built and expects these API endpoints to be available.

## Mobile App API Expectations
The mobile app (accentaura_mobile_app) expects the following:
- Base URL: `https://api.accentaura.com/v1` (configurable in ApiService)
- All endpoints prefixed with `/v1/`
- Authentication: Bearer token in Authorization header
- Content-Type: application/json
- Key endpoints used by mobile app:
  - POST /v1/auth/login (email, password)
  - POST /v1/auth/oauth (provider, token)
  - POST /v1/auth/refresh (refreshToken)
  - POST /v1/auth/validate (token)
  - GET /v1/lessons?from=X&to=Y
  - GET /v1/lessons/:level
  - GET /v1/progress/:userId
  - POST /v1/progress (ProgressUpdate)
  - POST /v1/ai/chat (prompt)
  - POST /v1/ai/analyze-speech (multipart audio file)
  - POST /v1/ai/interview/start
  - POST /v1/ai/interview/submit (multipart audio/video)
  - GET /v1/leaderboard?limit=100
  - GET /v1/leaderboard/rank/:userId

- [x] 1. Project Setup and Configuration
  - Initialize Node.js project with TypeScript configuration in a new `accentaura-backend` directory
  - Set up project structure with folders for config, models, controllers, services, routes, middlewares, utils, types
  - Configure tsconfig.json with strict mode and ES2022 target
  - Install core dependencies: express, typescript, @types/node, @types/express, ts-node, nodemon
  - Install additional dependencies: cors, helmet, compression, dotenv, zod, bcrypt, jsonwebtoken, axios, multer
  - Install type definitions: @types/cors, @types/bcrypt, @types/jsonwebtoken, @types/multer
  - Create .env.example file with all required environment variables (DATABASE_URL, MONGODB_URI, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, GEMINI_API_KEY, FASTAPI_URL, PORT, NODE_ENV, GOOGLE_CLIENT_ID, FACEBOOK_APP_ID)
  - Set up .gitignore for node_modules, .env, dist, logs, uploads
  - Create package.json with scripts for dev, build, start, test, migrate, seed
  - _Requirements: 1.1, 9.1, 9.4_

- [x] 2. Database Setup and Configuration
  - [x] 2.1 Configure PostgreSQL with Prisma
    - Install Prisma dependencies: @prisma/client, prisma
    - Initialize Prisma with `npx prisma init`
    - Create Prisma schema with User, Lesson, Progress, Badge, UserBadge, RefreshToken models
    - Configure database connection in config/db.ts with connection pooling
    - Run initial migration with `npx prisma migrate dev`
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 2.2 Configure MongoDB with Mongoose
    - Install mongoose and @types/mongoose
    - Create MongoDB connection in config/mongo.ts with retry logic
    - Define Mongoose schemas for AIInteractionLog, InterviewSession, Feedback
    - Export models for use in services
    - _Requirements: 4.3, 6.4_
  
  - [x] 2.3 Configure Redis for caching
    - Install redis and @types/redis
    - Create Redis connection in config/redis.ts
    - Implement connection error handling and reconnection logic
    - _Requirements: 7.4, 10.2_

- [x] 3. Environment Configuration and Logging
  - [x] 3.1 Set up environment variable validation
    - Install zod for schema validation
    - Create config/env.ts with Zod schemas for all environment variables
    - Validate environment variables on application startup
    - Export typed environment configuration
    - _Requirements: 9.4, 11.4_
  
  - [x] 3.2 Configure Winston logger
    - Install winston for logging
    - Create config/logger.ts with JSON format and log levels
    - Configure different transports for development and production
    - Implement log sanitization to exclude sensitive data
    - _Requirements: 9.4, 11.2_

- [x] 4. Implement Core Utilities
  - [x] 4.1 Create JWT utility functions
    - Implement generateAccessToken with 15-minute expiry
    - Implement generateRefreshToken with 7-day expiry
    - Create verifyToken function with error handling
    - _Requirements: 1.2, 1.4, 9.3_
  
  - [x] 4.2 Create password utility functions
    - Implement hashPassword using bcrypt with 12 salt rounds
    - Implement comparePassword for validation
    - _Requirements: 1.1, 9.2_
  
  - [x] 4.3 Create response utility functions
    - Implement standardized success response format (mobile app expects direct JSON responses, not wrapped)
    - Implement standardized error response format (mobile app expects { message: string } in error responses)
    - Note: Mobile app ApiService expects direct data responses, not { success: true, data: {...} } wrappers
    - _Requirements: 11.1_

- [x] 5. Implement Error Handling
  - [x] 5.1 Create custom error classes
    - Implement AppError base class
    - Create ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ExternalServiceError
    - _Requirements: 11.1_
  
  - [x] 5.2 Create error middleware
    - Implement global error handler
    - Add error logging with Winston
    - Return appropriate HTTP status codes and error messages
    - _Requirements: 11.1, 11.2_

- [x] 6. Implement Middleware
  - [x] 6.1 Create authentication middleware
    - Extract and validate JWT from Authorization header
    - Attach user payload to request object
    - Handle token expiration and invalid tokens
    - _Requirements: 1.5, 9.3_
  
  - [x] 6.2 Create validation middleware
    - Implement Zod schema validation for request body, query, params
    - Return validation errors with details
    - _Requirements: 9.6_
  
  - [x] 6.2.1 Create file upload middleware
    - Install and configure multer for multipart/form-data handling
    - Set file size limits (audio: 10MB, video: 50MB)
    - Configure file type validation (audio: .wav, .mp3, .m4a; video: .mp4, .mov)
    - Store files temporarily for processing
    - _Requirements: 5.1, 6.2_
  
  - [x] 6.3 Create rate limiting middleware
    - Implement general rate limiter (100 req/15min)
    - Implement AI endpoint rate limiter (10 req/min)
    - _Requirements: 9.5_
  
  - [x] 6.4 Create CORS middleware configuration
    - Configure CORS to allow mobile app origins
    - Allow credentials for authentication
    - Set appropriate headers (Authorization, Content-Type)
    - Configure for development (localhost) and production domains
    - _Requirements: 9.1_

- [x] 7. Implement Authentication Service
  - [x] 7.1 Create AuthService class
    - Implement signup method with password hashing and user creation (for future use)
    - Implement login method with credential validation and token generation (mobile app expects: { token, refreshToken, user, progress })
    - Implement loginWithOAuth for Google and Facebook (mobile app expects: { token, refreshToken, user, progress })
    - Implement refreshToken method (mobile app expects: { token, refreshToken })
    - Implement logout method with token invalidation (for future use)
    - Implement validateToken method (mobile app expects: { valid: boolean })
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_
  
  - [x] 7.2 Implement OAuth token verification
    - Create verifyGoogleToken function using Google OAuth2 API
    - Create verifyFacebookToken function using Facebook Graph API
    - _Requirements: 1.3_

- [x] 8. Implement Authentication Routes and Controllers
  - [x] 8.1 Create auth controller
    - Implement signup handler (not used by mobile app yet, but part of design)
    - Implement login handler (POST /auth/login - mobile app expects email/password)
    - Implement oauth handler (POST /auth/oauth - mobile app expects provider/token)
    - Implement refresh handler (POST /auth/refresh - mobile app expects refreshToken)
    - Implement logout handler (not used by mobile app yet)
    - Implement profile handler (not used by mobile app yet)
    - Implement validate handler (POST /auth/validate - mobile app expects token validation)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_
  
  - [x] 8.2 Create auth routes
    - Define POST /auth/login with validation (mobile app path: /auth/login)
    - Define POST /auth/oauth with validation (mobile app path: /auth/oauth)
    - Define POST /auth/refresh with validation (mobile app path: /auth/refresh)
    - Define POST /auth/validate with validation (mobile app path: /auth/validate)
    - Define POST /auth/signup with validation (for future use)
    - Define POST /auth/logout with auth middleware (for future use)
    - Define GET /auth/profile with auth middleware (for future use)
    - Note: Mobile app expects /v1 prefix, so routes should be /v1/auth/*
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [x] 9. Implement Lesson Service
  - [x] 9.1 Create LessonService class
    - Implement getLessons method with lock status calculation (mobile app expects: { lessons: [{ id, level, title, type, xpReward, isLocked, isCompleted }] })
    - Implement getLesson method with activity details (mobile app expects full Lesson object with activities array)
    - Implement completeLesson method with XP calculation (for future use)
    - Implement calculateXP helper method
    - Implement checkLessonUnlock helper method based on user progress
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 9.2 Create lesson seed script
    - Generate 100 lesson records with metadata (level, title, type, xpReward)
    - Create sample activities for each lesson type (flashcards, MCQs, fill-in-blank, listening, speaking)
    - Include media URLs for audio/images (can use placeholder URLs initially)
    - Seed database with lesson data using Prisma
    - _Requirements: 2.1_

- [x] 10. Implement Lesson Routes and Controllers
  - [x] 10.1 Create lesson controller
    - Implement getLessons handler with pagination (mobile app expects 'from' and 'to' query params)
    - Implement getLesson handler (mobile app expects level as path param)
    - Implement completeLesson handler (not used by mobile app yet)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 10.2 Create lesson routes
    - Define GET /v1/lessons with auth middleware and query validation (mobile app path: /lessons?from=X&to=Y)
    - Define GET /v1/lessons/:level with auth middleware (mobile app path: /lessons/:level)
    - Define POST /v1/lessons/complete with auth middleware and validation (for future use)
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 11. Implement Progress Service
  - [x] 11.1 Create ProgressService class
    - Implement getUserProgress method
    - Implement syncProgress method with batch updates
    - Implement awardXP method with level-up logic
    - Implement updateStreak method with date calculation
    - Implement awardBadge method
    - Implement checkLevelUp helper method
    - Implement checkBadgeEligibility helper method
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 8.3_
  
  - [x] 11.2 Create badge seed script
    - Define badge requirements and metadata
    - Seed database with badge data
    - _Requirements: 3.5_

- [x] 12. Implement Progress Routes and Controllers
  - [x] 12.1 Create progress controller
    - Implement getUserProgress handler (mobile app expects GET /progress/:userId)
    - Implement saveProgress handler (mobile app expects POST /progress with ProgressUpdate)
    - Implement syncProgress handler (for future batch sync)
    - Implement awardXP handler (for future use)
    - Implement updateStreak handler (for future use)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3_
  
  - [x] 12.2 Create progress routes
    - Define GET /v1/progress/:userId with auth middleware (mobile app path: /progress/:userId)
    - Define POST /v1/progress with auth middleware and validation (mobile app path: /progress)
    - Define POST /v1/progress/sync with auth middleware and validation (for future use)
    - Define POST /v1/progress/xp with auth middleware and validation (for future use)
    - Define POST /v1/progress/streak with auth middleware (for future use)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3_

- [ ] 13. Implement Cache Service
  - [x] 13.1 Create CacheService class
    - Implement get method with type safety
    - Implement set method with TTL support
    - Implement del method
    - Implement invalidate method with pattern matching
    - Implement cacheLeaderboard method
    - Implement getCachedLeaderboard method
    - Implement invalidateLeaderboard method
    - _Requirements: 7.4, 10.2_

- [x] 14. Implement Leaderboard Service
  - [x] 14.1 Create LeaderboardService class
    - Implement getLeaderboard method with caching (mobile app expects: { entries: [{ userId, username, avatarUrl, totalXp, rank, streak }], lastUpdated })
    - Implement getUserRank method with percentile calculation (mobile app expects: { rank, totalUsers, percentile })
    - Implement cache invalidation on XP updates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Implement Leaderboard Routes and Controllers
  - [x] 15.1 Create leaderboard controller
    - Implement getLeaderboard handler (mobile app expects limit query param)
    - Implement getUserRank handler (mobile app expects userId path param)
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 15.2 Create leaderboard routes
    - Define GET /v1/leaderboard with auth middleware and query validation (mobile app path: /leaderboard?limit=100)
    - Define GET /v1/leaderboard/rank/:userId with auth middleware (mobile app path: /leaderboard/rank/:userId)
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 16. Implement AI Service
  - [x] 16.1 Create AIService class
    - Implement chat method with FastAPI integration (mobile app expects: { message: string, audioUrl?: string })
    - Implement analyzeSpeech method with file upload (mobile app expects: { score: number, feedback: string, details?: object })
    - Implement analyzeConfidence method (for future use)
    - Implement analyzeInterview method (mobile app expects: { confidenceScore: number, grammarScore: number, feedback: string, performanceMetrics?: object })
    - Implement callFastAPI helper with retry logic and timeout (30 seconds)
    - Implement logInteraction method for MongoDB logging
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 17. Implement AI Routes and Controllers
  - [x] 17.1 Create AI controller
    - Implement chat handler (mobile app expects prompt in body, returns message and optional audioUrl)
    - Implement speechAnalyze handler with multipart file upload (mobile app sends audio file, expects score, feedback, details)
    - Implement confidenceScore handler (for future use)
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3_
  
  - [x] 17.2 Create AI routes
    - Define POST /v1/ai/chat with auth middleware and validation (mobile app path: /ai/chat)
    - Define POST /v1/ai/analyze-speech with auth middleware and file upload (mobile app path: /ai/analyze-speech)
    - Define POST /v1/ai/confidence-score with auth middleware and validation (for future use)
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3_

- [-] 18. Implement Interview Service
  - [x] 18.1 Create InterviewService class
    - Implement startInterview method with question generation
    - Implement submitInterview method with AI analysis
    - Implement getInterview method
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 19. Implement Interview Routes and Controllers
  - [x] 19.1 Create interview controller
    - Implement startInterview handler (mobile app expects sessionId and questions array)
    - Implement submitInterview handler with multipart file upload (mobile app sends sessionId, audio, optional video; expects confidenceScore, grammarScore, feedback, performanceMetrics)
    - Implement getInterview handler (for future use)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 19.2 Create interview routes
    - Define POST /v1/ai/interview/start with auth middleware and validation (mobile app path: /ai/interview/start)
    - Define POST /v1/ai/interview/submit with auth middleware and file upload (mobile app path: /ai/interview/submit)
    - Define GET /v1/ai/interview/:sessionId with auth middleware (for future use)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 20. Implement FastAPI AI Microservice
  - [x] 20.1 Set up FastAPI project structure
    - Initialize Python project with requirements.txt
    - Create main.py with FastAPI app
    - Set up CORS middleware
    - Configure Gemini API client
    - _Requirements: 4.1, 5.1, 6.1_
  
  - [x] 20.2 Implement chat endpoint
    - Create POST /chat endpoint
    - Accept: { prompt: string, conversationId?: string }
    - Implement conversation context management
    - Integrate with Gemini Pro API
    - Return: { response: string, conversationId: string }
    - _Requirements: 4.1, 4.2_
  
  - [x] 20.3 Implement speech analysis endpoint
    - Create POST /analyze/speech endpoint
    - Accept: multipart/form-data with audio file
    - Implement audio file processing (transcription if needed)
    - Integrate with Gemini Pro for speech analysis
    - Return: { confidence: float, grammarScore: float, feedback: string, pronunciation?: dict }
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 20.4 Implement confidence analysis endpoint
    - Create POST /analyze/confidence endpoint
    - Accept: { text: string }
    - Analyze text confidence with Gemini Pro
    - Return: { confidence: float, suggestions: list[string] }
    - _Requirements: 5.4_
  
  - [x] 20.5 Implement interview analysis endpoint
    - Create POST /interview/analyze endpoint
    - Accept: multipart/form-data with audio file, optional video file, questions array
    - Process audio and video files
    - Analyze with Gemini Pro for comprehensive feedback
    - Return: { confidence: float, grammarScore: float, bodyLanguage?: dict, feedback: string, mistakes?: list }
    - _Requirements: 6.2, 6.3_
  
  - [x] 20.6 Implement health check endpoint
    - Create GET /health endpoint
    - Check Gemini API connectivity
    - Return service status
    - _Requirements: 11.5_

- [x] 21. Implement Health Check and Monitoring
  - [x] 21.1 Create health check endpoint
    - Implement GET /health route (not /v1/health - for load balancers)
    - Check PostgreSQL connection
    - Check MongoDB connection
    - Check Redis connection
    - Check AI service connectivity
    - Return comprehensive health status with timestamp
    - _Requirements: 11.5_
  
  - [x] 21.2 Set up monitoring and alerting
    - Integrate Sentry for error tracking (optional for MVP)
    - Configure DataDog for performance monitoring (optional for MVP)
    - Set up alerts for critical errors (optional for MVP)
    - _Requirements: 11.3_

- [x] 22. Implement Main Server
  - [x] 22.1 Create server.ts
    - Initialize Express app
    - Configure middleware (cors with mobile app origins, helmet, compression, body-parser, express.json, express.urlencoded)
    - Register all routes under /v1 prefix (mobile app expects /v1/auth/*, /v1/lessons/*, etc.)
    - Register error middleware
    - Connect to databases (PostgreSQL, MongoDB, Redis)
    - Start server on PORT from env (default 3000)
    - Implement graceful shutdown on SIGTERM/SIGINT
    - _Requirements: 9.1, 10.1, 10.4_

- [x] 23. Create Docker Configuration
  - [x] 23.1 Create Dockerfiles
    - Create Dockerfile for Node.js API
    - Create Dockerfile for FastAPI microservice
    - _Requirements: 10.5_
  
  - [x] 23.2 Create docker-compose.yml
    - Define services for API, AI microservice, PostgreSQL, MongoDB, Redis
    - Configure networking and volumes
    - Set environment variables
    - _Requirements: 10.5_

- [x] 24. Testing Implementation
  - [x] 24.1 Write unit tests for utilities
    - Test JWT generation and validation
    - Test password hashing and comparison
    - Test error classes
    - _Requirements: 12.1_
  
  - [x] 24.2 Write unit tests for services
    - Test AuthService methods
    - Test LessonService methods
    - Test ProgressService methods
    - Test AIService methods
    - _Requirements: 12.2_
  
  - [x] 24.3 Write integration tests for API endpoints
    - Test auth flow (signup → login → refresh → logout)
    - Test lesson endpoints with authentication
    - Test progress endpoints
    - Test AI endpoints with mocked FastAPI
    - Test leaderboard endpoints
    - Test interview endpoints
    - _Requirements: 12.3_
  
  - [x] 24.4 Write tests for FastAPI microservice
    - Test chat endpoint with mocked Gemini API
    - Test speech analysis endpoint
    - Test confidence analysis endpoint
    - Test interview analysis endpoint
    - Test error handling
    - _Requirements: 12.4_

- [ ] 25. Documentation and Deployment Preparation
  - [x] 25.1 Create API documentation
    - Document all endpoints with request/response examples matching mobile app expectations
    - Create Postman collection with all /v1/* endpoints
    - Write README with setup instructions (Node.js, PostgreSQL, MongoDB, Redis, Python/FastAPI)
    - Document environment variables needed
    - Document mobile app integration (base URL: https://api.accentaura.com/v1)
    - _Requirements: 11.4_
  
  - [x] 25.2 Create deployment scripts
    - Create Prisma migration scripts for PostgreSQL
    - Create seed data scripts for lessons (100 levels) and badges
    - Create deployment checklist
    - Document how to run migrations and seeds
    - _Requirements: 10.5_
  
  - [x] 25.3 Create README files
    - Create main README.md with project overview and setup
    - Create DEVELOPMENT.md with local development guide
    - Create API.md with endpoint documentation
    - Create DEPLOYMENT.md with production deployment guide
    - _Requirements: 11.4_

## Implementation Priority

For MVP (Minimum Viable Product), prioritize these tasks in order:
1. Tasks 1-6: Project setup, database config, environment, utilities, error handling, middleware
2. Tasks 7-8: Authentication (login, OAuth, refresh, validate)
3. Tasks 9-10: Lessons (get lessons, get lesson by level)
4. Tasks 11-12: Progress (get progress, save progress)
5. Task 22: Main server setup
6. Task 21.1: Health check endpoint
7. Tasks 20.1-20.3, 20.6: FastAPI setup (chat, speech analysis, health)
8. Tasks 16-17: AI integration (chat, speech analysis)
9. Tasks 13-15: Caching and leaderboard
10. Tasks 18-19: Interview functionality
11. Tasks 23-25: Docker, testing, documentation

Optional for later:
- Task 21.2: Monitoring and alerting (Sentry, DataDog)
- Task 24: Comprehensive testing (can start with basic tests)
- Advanced features: Badge system, streak management, XP calculations

