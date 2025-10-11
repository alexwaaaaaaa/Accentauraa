# Design Document

## Overview

The Accentaura Backend is a microservices-based system consisting of a main REST API (Node.js/Express/TypeScript) and an AI microservice (FastAPI/Python). The main API handles authentication, lesson management, progress tracking, and data persistence using PostgreSQL and MongoDB. The AI microservice integrates with Google Gemini Pro for chat, speech analysis, and interview feedback. The architecture follows RESTful principles with JWT-based authentication, implements caching for performance, and uses Socket.io for real-time features.

### Key Design Principles

- **Microservices Architecture**: Separation of core API and AI services for independent scaling
- **Security-First**: JWT authentication, bcrypt password hashing, HTTPS enforcement, input validation
- **Performance-Optimized**: Database indexing, Redis caching, CDN for media, connection pooling
- **Scalable**: Horizontal scaling support, stateless API design, load balancing ready
- **Resilient**: Comprehensive error handling, retry logic, circuit breakers for external services
- **Observable**: Structured logging, health checks, performance monitoring, error tracking

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    Mobile[Mobile App<br/>Flutter]
    LB[Load Balancer]
    API1[Main API<br/>Node.js/Express]
    API2[Main API<br/>Node.js/Express]
    AI[AI Microservice<br/>FastAPI/Python]
    PG[(PostgreSQL<br/>Users, Lessons, Progress)]
    Mongo[(MongoDB<br/>AI Logs, Feedback)]
    Redis[(Redis<br/>Cache, Sessions)]
    S3[AWS S3<br/>Media Storage]
    Gemini[Google Gemini Pro<br/>AI Service]
    
    Mobile -->|HTTPS| LB
    LB --> API1
    LB --> API2
    API1 -->|HTTP| AI
    API2 -->|HTTP| AI
    API1 --> PG
    API2 --> PG
    API1 --> Mongo
    API2 --> Mongo
    API1 --> Redis
    API2 --> Redis
    API1 --> S3
    API2 --> S3
    AI --> Gemini
    AI --> Mongo
```

### Technology Stack

**Main API (Node.js)**
- Runtime: Node.js 20+
- Framework: Express.js 4.x
- Language: TypeScript 5.x
- ORM: Prisma (PostgreSQL)
- MongoDB Driver: Mongoose
- Authentication: jsonwebtoken, bcrypt
- Validation: Zod
- HTTP Client: Axios
- Real-time: Socket.io

**AI Microservice (Python)**
- Runtime: Python 3.11+
- Framework: FastAPI
- AI SDK: google-generativeai
- Validation: Pydantic
- HTTP Client: httpx

**Databases**
- PostgreSQL 15+ (relational data)
- MongoDB 6+ (AI logs, unstructured data)
- Redis 7+ (caching, sessions)

**Infrastructure**
- Storage: AWS S3 / Firebase Storage
- Monitoring: Sentry / DataDog
- Deployment: Docker + Kubernetes / AWS ECS


## Components and Interfaces

### Main API Structure

```
src/
├── config/
│   ├── db.ts              # PostgreSQL connection (Prisma)
│   ├── mongo.ts           # MongoDB connection (Mongoose)
│   ├── redis.ts           # Redis connection
│   ├── env.ts             # Environment variables validation
│   └── logger.ts          # Winston logger configuration
├── models/
│   ├── user.model.ts      # Prisma User model
│   ├── lesson.model.ts    # Prisma Lesson model
│   ├── progress.model.ts  # Prisma Progress model
│   └── feedback.model.ts  # Mongoose Feedback schema
├── controllers/
│   ├── auth.controller.ts
│   ├── lesson.controller.ts
│   ├── progress.controller.ts
│   ├── ai.controller.ts
│   └── interview.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── lesson.service.ts
│   ├── progress.service.ts
│   ├── ai.service.ts      # Calls FastAPI endpoints
│   └── cache.service.ts
├── routes/
│   ├── auth.routes.ts
│   ├── lesson.routes.ts
│   ├── progress.routes.ts
│   ├── ai.routes.ts
│   └── interview.routes.ts
├── middlewares/
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── error.middleware.ts
│   └── rateLimit.middleware.ts
├── utils/
│   ├── jwt.util.ts
│   ├── password.util.ts
│   └── response.util.ts
└── server.ts
```

### AI Microservice Structure

```
ai-microservice/
├── main.py                # FastAPI app
├── routers/
│   ├── chat.py
│   ├── speech.py
│   └── interview.py
├── services/
│   ├── gemini.service.py
│   └── analysis.service.py
├── models/
│   ├── chat.model.py
│   ├── speech.model.py
│   └── interview.model.py
├── config/
│   └── settings.py
└── requirements.txt
```


## API Endpoints

### Authentication Endpoints

**POST /api/auth/signup**
- Request: `{ email, password, name }`
- Response: `{ token, refreshToken, user }`
- Logic: Hash password, create user, generate JWT tokens

**POST /api/auth/login**
- Request: `{ email, password }`
- Response: `{ token, refreshToken, user, progress }`
- Logic: Validate credentials, generate tokens, fetch progress

**POST /api/auth/oauth**
- Request: `{ provider, token }` (provider: 'google' | 'facebook')
- Response: `{ token, refreshToken, user, progress }`
- Logic: Validate OAuth token, create/update user, generate JWT

**POST /api/auth/refresh**
- Request: `{ refreshToken }`
- Response: `{ token }`
- Logic: Validate refresh token, issue new access token

**POST /api/auth/logout**
- Request: `{ refreshToken }`
- Response: `{ success: true }`
- Logic: Invalidate refresh token

**GET /api/auth/profile**
- Headers: `Authorization: Bearer <token>`
- Response: `{ user, progress }`
- Logic: Validate JWT, return user data

### Lesson Endpoints

**GET /api/lessons**
- Query: `?from=1&to=100`
- Headers: `Authorization: Bearer <token>`
- Response: `{ lessons: [{ id, level, title, type, xpReward, isLocked, isCompleted }] }`
- Logic: Fetch lessons, determine lock status based on user progress

**GET /api/lessons/:id**
- Headers: `Authorization: Bearer <token>`
- Response: `{ lesson: { id, level, title, type, xpReward, activities: [...] } }`
- Logic: Fetch lesson with all activities, media URLs

**POST /api/lessons/complete**
- Request: `{ lessonId, score, timeTaken }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ xpEarned, newLevel, badges, progress }`
- Logic: Calculate XP, update progress, check for level up and badges

### Progress Endpoints

**GET /api/progress/:userId**
- Headers: `Authorization: Bearer <token>`
- Response: `{ currentLevel, totalXp, streak, coins, badges, lessonProgress }`
- Logic: Fetch user progress from PostgreSQL

**POST /api/progress/sync**
- Request: `{ updates: [{ lessonId, completed, score, timestamp }] }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ synced: number, progress }`
- Logic: Process batch updates, merge with server state, return latest progress

**POST /api/progress/xp**
- Request: `{ amount, source }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ totalXp, currentLevel, leveledUp }`
- Logic: Award XP, check for level up

**POST /api/progress/streak**
- Headers: `Authorization: Bearer <token>`
- Response: `{ streak, lastActivityDate }`
- Logic: Increment or reset streak based on last activity date


### AI Endpoints (Main API → FastAPI)

**POST /api/ai/chat**
- Request: `{ prompt, userId, conversationId? }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ response, conversationId }`
- Logic: Forward to FastAPI `/chat`, log interaction in MongoDB

**POST /api/ai/speech-analyze**
- Request: `multipart/form-data { audioFile, userId }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ confidence, grammarScore, feedback, pronunciation }`
- Logic: Forward audio to FastAPI `/analyze/speech`, log results

**POST /api/ai/confidence-score**
- Request: `{ text, userId }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ confidence, suggestions }`
- Logic: Analyze text confidence via FastAPI

### Interview Endpoints

**POST /api/interview/start**
- Request: `{ interviewType }` (e.g., 'job', 'casual')
- Headers: `Authorization: Bearer <token>`
- Response: `{ sessionId, questions }`
- Logic: Create interview session, generate questions via AI

**POST /api/interview/submit**
- Request: `multipart/form-data { sessionId, audioFile, videoFile? }`
- Headers: `Authorization: Bearer <token>`
- Response: `{ confidence, grammarScore, bodyLanguage, feedback, mistakes }`
- Logic: Forward to FastAPI for analysis, store results in MongoDB

**GET /api/interview/:sessionId**
- Headers: `Authorization: Bearer <token>`
- Response: `{ session, results }`
- Logic: Fetch interview session and results

### Leaderboard Endpoints

**GET /api/leaderboard**
- Query: `?limit=100`
- Headers: `Authorization: Bearer <token>`
- Response: `{ entries: [{ userId, username, avatarUrl, totalXp, rank, streak }], lastUpdated }`
- Logic: Fetch top users by XP, cache for 5 minutes

**GET /api/leaderboard/rank/:userId**
- Headers: `Authorization: Bearer <token>`
- Response: `{ rank, totalUsers, percentile }`
- Logic: Calculate user's rank and percentile

### Health & Monitoring

**GET /health**
- Response: `{ status, database, redis, ai_service, timestamp }`
- Logic: Check all service connections


## FastAPI AI Microservice Endpoints

**POST /chat**
- Request: `{ prompt: str, conversationId?: str }`
- Response: `{ response: str, conversationId: str }`
- Logic: Call Gemini Pro, maintain conversation context

**POST /analyze/speech**
- Request: `multipart/form-data { audio: File }`
- Response: `{ confidence: float, grammarScore: float, feedback: str, pronunciation: dict }`
- Logic: Process audio, analyze with Gemini, return metrics

**POST /analyze/confidence**
- Request: `{ text: str }`
- Response: `{ confidence: float, suggestions: list[str] }`
- Logic: Analyze text confidence using Gemini

**POST /interview/analyze**
- Request: `multipart/form-data { audio: File, video?: File, questions: list[str] }`
- Response: `{ confidence: float, grammarScore: float, bodyLanguage: dict, feedback: str, mistakes: list }`
- Logic: Comprehensive interview analysis with Gemini

**GET /health**
- Response: `{ status: str, gemini_api: str }`
- Logic: Check Gemini API connectivity


## Data Models

### PostgreSQL Schema (Prisma)

**User Model**
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String?   // null for OAuth users
  name          String?
  avatarUrl     String?
  provider      AuthProvider @default(EMAIL)
  currentLevel  Int       @default(1)
  totalXp       Int       @default(0)
  streak        Int       @default(0)
  coins         Int       @default(0)
  lastActivityDate DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  progress      Progress[]
  badges        UserBadge[]
  refreshTokens RefreshToken[]
  
  @@index([email])
  @@index([totalXp])
}

enum AuthProvider {
  EMAIL
  GOOGLE
  FACEBOOK
}
```

**Lesson Model**
```prisma
model Lesson {
  id          String   @id @default(uuid())
  level       Int      @unique
  title       String
  type        LessonType
  xpReward    Int
  content     Json     // JSONB for activities
  mediaUrls   Json?    // Array of S3/Firebase URLs
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  progress    Progress[]
  
  @@index([level])
}

enum LessonType {
  VOCABULARY
  GRAMMAR
  SPEAKING
  LISTENING
  MIXED
}
```

**Progress Model**
```prisma
model Progress {
  id          String   @id @default(uuid())
  userId      String
  lessonId    String
  completed   Boolean  @default(false)
  score       Float?
  xpEarned    Int      @default(0)
  timeTaken   Int?     // seconds
  attempts    Int      @default(1)
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

**Badge Model**
```prisma
model Badge {
  id          String   @id @default(uuid())
  name        String   @unique
  description String
  iconUrl     String
  requirement String   // e.g., "complete_10_lessons", "reach_level_5"
  createdAt   DateTime @default(now())
  
  users       UserBadge[]
}

model UserBadge {
  id        String   @id @default(uuid())
  userId    String
  badgeId   String
  earnedAt  DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge     Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, badgeId])
  @@index([userId])
}
```

**RefreshToken Model**
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([userId])
}
```


### MongoDB Schema (Mongoose)

**AI Interaction Log**
```typescript
interface AIInteractionLog {
  _id: ObjectId;
  userId: string;
  type: 'chat' | 'speech' | 'interview';
  prompt?: string;
  response?: string;
  audioUrl?: string;
  videoUrl?: string;
  analysis?: {
    confidence?: number;
    grammarScore?: number;
    feedback?: string;
    pronunciation?: object;
    bodyLanguage?: object;
  };
  conversationId?: string;
  timestamp: Date;
  metadata?: object;
}
```

**Interview Session**
```typescript
interface InterviewSession {
  _id: ObjectId;
  sessionId: string;
  userId: string;
  interviewType: string;
  questions: string[];
  responses: Array<{
    questionIndex: number;
    audioUrl?: string;
    videoUrl?: string;
    transcript?: string;
    analysis?: object;
  }>;
  finalResults?: {
    overallConfidence: number;
    grammarScore: number;
    feedback: string;
    mistakes: string[];
    strengths: string[];
  };
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
}
```

**Feedback Collection**
```typescript
interface Feedback {
  _id: ObjectId;
  userId: string;
  lessonId?: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  rating?: number;
  metadata?: object;
  createdAt: Date;
}
```


## Authentication Flow

### JWT Token Strategy

**Access Token**
- Expiry: 15 minutes
- Payload: `{ userId, email, iat, exp }`
- Used for: All protected API requests

**Refresh Token**
- Expiry: 7 days
- Stored in: PostgreSQL RefreshToken table
- Used for: Obtaining new access tokens

**Token Refresh Flow**
1. Client detects access token expiration (401 response)
2. Client sends refresh token to `/api/auth/refresh`
3. Server validates refresh token from database
4. Server generates new access token
5. Server returns new access token
6. Client retries original request with new token

### OAuth Flow (Google/Facebook)

1. Mobile app initiates OAuth with provider
2. User authenticates with provider
3. Provider returns OAuth token to mobile app
4. Mobile app sends OAuth token to `/api/auth/oauth`
5. Backend validates token with provider API
6. Backend fetches user info from provider
7. Backend creates or updates user in database
8. Backend generates JWT tokens
9. Backend returns JWT tokens and user data


## Service Layer Design

### Auth Service
```typescript
class AuthService {
  async signup(email: string, password: string, name?: string): Promise<AuthResult>
  async login(email: string, password: string): Promise<AuthResult>
  async loginWithOAuth(provider: string, token: string): Promise<AuthResult>
  async refreshToken(refreshToken: string): Promise<{ token: string }>
  async logout(refreshToken: string): Promise<void>
  async validateToken(token: string): Promise<TokenPayload>
  private async generateTokens(userId: string): Promise<{ token: string, refreshToken: string }>
  private async hashPassword(password: string): Promise<string>
  private async comparePassword(password: string, hash: string): Promise<boolean>
  private async verifyOAuthToken(provider: string, token: string): Promise<OAuthUserInfo>
}
```

### Lesson Service
```typescript
class LessonService {
  async getLessons(from: number, to: number, userId: string): Promise<Lesson[]>
  async getLesson(lessonId: string, userId: string): Promise<Lesson>
  async completeLesson(userId: string, lessonId: string, score: number, timeTaken: number): Promise<CompletionResult>
  private async calculateXP(score: number, timeTaken: number, baseXP: number): Promise<number>
  private async checkLessonUnlock(userId: string, level: number): Promise<boolean>
  private async unlockNextLesson(userId: string, currentLevel: number): Promise<void>
}
```

### Progress Service
```typescript
class ProgressService {
  async getUserProgress(userId: string): Promise<UserProgress>
  async syncProgress(userId: string, updates: ProgressUpdate[]): Promise<SyncResult>
  async awardXP(userId: string, amount: number, source: string): Promise<XPResult>
  async updateStreak(userId: string): Promise<StreakResult>
  async awardBadge(userId: string, badgeId: string): Promise<void>
  private async checkLevelUp(userId: string, newXP: number): Promise<boolean>
  private async checkBadgeEligibility(userId: string): Promise<string[]>
  private async calculateStreak(userId: string, lastActivityDate: Date): Promise<number>
}
```

### AI Service
```typescript
class AIService {
  private fastApiUrl: string;
  
  async chat(prompt: string, userId: string, conversationId?: string): Promise<ChatResponse>
  async analyzeSpeech(audioFile: Buffer, userId: string): Promise<SpeechAnalysis>
  async analyzeConfidence(text: string): Promise<ConfidenceScore>
  async analyzeInterview(audioFile: Buffer, videoFile?: Buffer, questions: string[]): Promise<InterviewAnalysis>
  private async callFastAPI<T>(endpoint: string, data: any): Promise<T>
  private async logInteraction(userId: string, type: string, data: any): Promise<void>
}
```

### Cache Service
```typescript
class CacheService {
  async get<T>(key: string): Promise<T | null>
  async set(key: string, value: any, ttl?: number): Promise<void>
  async del(key: string): Promise<void>
  async invalidate(pattern: string): Promise<void>
  
  // Specific cache methods
  async cacheLeaderboard(data: LeaderboardData, ttl: number): Promise<void>
  async getCachedLeaderboard(): Promise<LeaderboardData | null>
  async invalidateLeaderboard(): Promise<void>
}
```


## Middleware Design

### Auth Middleware
```typescript
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedError('No token provided');
    
    const payload = await authService.validateToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
}
```

### Validation Middleware
```typescript
function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      next(new ValidationError(error.errors));
    }
  };
}
```

### Rate Limit Middleware
```typescript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
});
```

### Error Middleware
```typescript
function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }
  
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  // Default to 500 server error
  res.status(500).json({ error: 'Internal server error' });
}
```


## FastAPI AI Microservice Design

### Main Application Structure

```python
# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="Accentaura AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    prompt: str
    conversationId: str | None = None

class ChatResponse(BaseModel):
    response: str
    conversationId: str

class SpeechAnalysisResponse(BaseModel):
    confidence: float
    grammarScore: float
    feedback: str
    pronunciation: dict

class ConfidenceRequest(BaseModel):
    text: str

class ConfidenceResponse(BaseModel):
    confidence: float
    suggestions: list[str]

# Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(req: ChatRequest):
    model = genai.GenerativeModel("gemini-pro")
    
    # Build conversation context if conversationId exists
    prompt = f"You are an English learning assistant. {req.prompt}"
    
    response = model.generate_content(prompt)
    conversation_id = req.conversationId or generate_conversation_id()
    
    return ChatResponse(
        response=response.text,
        conversationId=conversation_id
    )

@app.post("/analyze/speech", response_model=SpeechAnalysisResponse)
async def analyze_speech(audio: UploadFile = File(...)):
    # Process audio file
    audio_bytes = await audio.read()
    
    # Use Gemini to analyze (placeholder - actual implementation may vary)
    model = genai.GenerativeModel("gemini-pro")
    
    analysis_prompt = """
    Analyze this speech for:
    1. Confidence level (0-1)
    2. Grammar correctness (0-1)
    3. Pronunciation quality
    4. Specific feedback for improvement
    
    Return structured analysis.
    """
    
    # In production, you'd transcribe audio first, then analyze
    # For now, this is a simplified version
    
    return SpeechAnalysisResponse(
        confidence=0.85,
        grammarScore=0.90,
        feedback="Good pronunciation. Work on intonation.",
        pronunciation={"clarity": 0.88, "accent": "neutral"}
    )

@app.post("/analyze/confidence", response_model=ConfidenceResponse)
async def analyze_confidence(req: ConfidenceRequest):
    model = genai.GenerativeModel("gemini-pro")
    
    prompt = f"""
    Analyze the confidence level of this text and provide suggestions:
    "{req.text}"
    
    Rate confidence from 0-1 and provide 3 specific suggestions.
    """
    
    response = model.generate_content(prompt)
    
    # Parse response (simplified)
    return ConfidenceResponse(
        confidence=0.75,
        suggestions=[
            "Use more assertive language",
            "Avoid filler words",
            "Structure sentences more clearly"
        ]
    )

@app.get("/health")
async def health_check():
    try:
        # Test Gemini API connection
        model = genai.GenerativeModel("gemini-pro")
        model.generate_content("test")
        return {"status": "healthy", "gemini_api": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "gemini_api": "disconnected", "error": str(e)}
```


## Database Design Decisions

### PostgreSQL for Relational Data

**Why PostgreSQL:**
- ACID compliance for critical user data
- Strong support for complex queries (leaderboard rankings)
- JSONB support for flexible lesson content
- Excellent indexing capabilities
- Mature ecosystem with Prisma ORM

**Indexing Strategy:**
- `users.email` - Fast login lookups
- `users.totalXp` - Leaderboard queries
- `progress.userId` - User progress retrieval
- `progress.lessonId` - Lesson completion stats
- `lessons.level` - Sequential lesson access
- `refreshTokens.token` - Token validation

**Connection Pooling:**
- Min connections: 5
- Max connections: 20
- Idle timeout: 10 seconds
- Connection timeout: 5 seconds

### MongoDB for Unstructured Data

**Why MongoDB:**
- Flexible schema for AI interaction logs
- High write throughput for logging
- Easy to store nested analysis results
- Good for time-series data (conversation history)

**Collections:**
- `ai_interactions` - Chat, speech, interview logs
- `interview_sessions` - Interview data with nested responses
- `feedback` - User feedback and bug reports

**Indexing:**
- `ai_interactions.userId` - User-specific queries
- `ai_interactions.timestamp` - Time-based queries
- `interview_sessions.sessionId` - Session lookups
- `interview_sessions.userId` - User interview history

### Redis for Caching

**Cache Strategy:**
- Leaderboard: 5 minutes TTL
- User progress: 1 minute TTL
- Lesson metadata: 1 hour TTL
- Session data: 15 minutes TTL

**Cache Keys:**
- `leaderboard:top100`
- `user:progress:{userId}`
- `lesson:{lessonId}`
- `session:{sessionId}`


## Error Handling Strategy

### Error Types

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(public errors: any[]) {
    super(400, 'Validation failed');
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, message);
  }
}

class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(503, `${service} service unavailable: ${message}`);
  }
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  path: string;
}
```

### Retry Logic for External Services

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```


## Security Implementation

### Password Security
- Algorithm: bcrypt
- Salt rounds: 12
- Never log passwords
- Enforce minimum length: 8 characters

### JWT Security
- Algorithm: HS256 (or RS256 for production)
- Secret key: 256-bit minimum
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Include: userId, email, iat, exp
- Exclude: password, sensitive data

### API Security
- HTTPS only (enforce in production)
- CORS configuration (whitelist mobile app origins)
- Rate limiting (100 req/15min general, 10 req/min for AI)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (sanitize inputs)
- CSRF protection (for web clients)

### Data Protection
- Encrypt sensitive data at rest
- Use environment variables for secrets
- Never commit secrets to git
- Implement audit logging for sensitive operations
- GDPR compliance (data deletion endpoints)

### OAuth Security
- Validate OAuth tokens with provider APIs
- Use HTTPS for OAuth redirects
- Store minimal user data from providers
- Implement token refresh for long-lived sessions


## Performance Optimization

### Database Optimization
- Use connection pooling (Prisma)
- Implement proper indexes
- Use `SELECT` specific fields (avoid `SELECT *`)
- Batch operations where possible
- Use database transactions for consistency
- Implement pagination (limit/offset)

### Caching Strategy
- Cache frequently accessed data (leaderboard, lessons)
- Implement cache invalidation on updates
- Use Redis for session storage
- Cache-aside pattern for read-heavy operations
- Set appropriate TTLs based on data volatility

### API Optimization
- Compress responses (gzip)
- Implement request/response compression
- Use CDN for static assets (S3 + CloudFront)
- Lazy load lesson content
- Implement pagination for large datasets
- Use streaming for large file uploads

### AI Service Optimization
- Queue AI requests to prevent overload
- Implement request timeout (30 seconds)
- Cache common AI responses
- Use async processing for non-critical tasks
- Implement circuit breaker for Gemini API

### Monitoring and Profiling
- Track response times per endpoint
- Monitor database query performance
- Track AI service latency
- Monitor memory usage
- Set up alerts for performance degradation


## Testing Strategy

### Unit Tests

**Models & Schemas**
- Test Prisma model validations
- Test Mongoose schema validations
- Test data transformations
- Test business logic in models

**Services**
- Mock database connections
- Test authentication logic
- Test XP calculation
- Test streak management
- Test badge awarding logic
- Mock external API calls (Gemini)

**Utilities**
- Test JWT generation/validation
- Test password hashing/comparison
- Test error handling utilities

### Integration Tests

**API Endpoints**
- Test auth flow (signup → login → refresh)
- Test lesson retrieval with auth
- Test progress updates
- Test AI endpoints with mocked FastAPI
- Test error responses
- Test rate limiting

**Database Operations**
- Test CRUD operations
- Test transactions
- Test concurrent updates
- Test data integrity

### End-to-End Tests

**Complete User Flows**
- User registration → login → fetch lessons → complete lesson → check progress
- OAuth login → fetch progress → sync offline data
- Start interview → submit responses → get feedback
- Chat with AI → receive response → log interaction

### Load Testing

**Performance Benchmarks**
- 100 concurrent users
- 1000 requests per minute
- Response time < 200ms for cached data
- Response time < 500ms for database queries
- AI endpoint response time < 5 seconds

### Testing Tools
- Jest (unit & integration tests)
- Supertest (API testing)
- Pytest (FastAPI tests)
- Artillery (load testing)
- Mock Service Worker (API mocking)


## Deployment Architecture

### Docker Configuration

**Main API Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

**AI Microservice Dockerfile**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose (Development)**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/accentaura
      - MONGODB_URI=mongodb://mongo:27017/accentaura
      - REDIS_URL=redis://redis:6379
      - FASTAPI_URL=http://ai-service:8000
    depends_on:
      - postgres
      - mongo
      - redis
      - ai-service
  
  ai-service:
    build: ./ai-microservice
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
  
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=accentaura
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.accentaura.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/accentaura
MONGODB_URI=mongodb://host:27017/accentaura
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# AI Service
FASTAPI_URL=http://ai-service:8000
GEMINI_API_KEY=your-gemini-api-key

# Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=accentaura-media
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### CI/CD Pipeline

**GitHub Actions Workflow**
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -t accentaura-api .
          docker push accentaura-api:latest
      - name: Deploy to production
        run: |
          # Deploy to AWS ECS / Kubernetes
```

### Scaling Strategy

**Horizontal Scaling**
- Run multiple API instances behind load balancer
- Stateless API design (no in-memory sessions)
- Use Redis for shared session storage
- Database connection pooling per instance

**Vertical Scaling**
- Increase instance resources for database
- Optimize queries before scaling
- Monitor resource usage

**Database Scaling**
- Read replicas for PostgreSQL
- Sharding for MongoDB (if needed)
- Redis cluster for high availability


## Monitoring and Logging

### Logging Strategy

**Log Levels**
- ERROR: Critical errors requiring immediate attention
- WARN: Warning conditions that should be reviewed
- INFO: General informational messages
- DEBUG: Detailed debugging information (dev only)

**Log Format (JSON)**
```json
{
  "timestamp": "2025-10-10T12:00:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "uuid",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "responseTime": 150,
  "ip": "192.168.1.1"
}
```

**What to Log**
- All API requests (method, path, status, response time)
- Authentication events (login, logout, token refresh)
- Errors with stack traces
- Database query performance (slow queries)
- External API calls (Gemini, OAuth providers)
- Security events (failed login attempts, rate limit hits)

**What NOT to Log**
- Passwords (plain or hashed)
- JWT tokens
- OAuth tokens
- Credit card information
- Personal identifiable information (PII)

### Monitoring Metrics

**Application Metrics**
- Request rate (requests per second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections
- Memory usage
- CPU usage

**Business Metrics**
- User registrations per day
- Lessons completed per day
- AI requests per day
- Average session duration
- User retention rate

**Database Metrics**
- Query execution time
- Connection pool usage
- Slow query count
- Database size
- Index usage

**External Service Metrics**
- Gemini API response time
- Gemini API error rate
- OAuth provider response time
- S3 upload/download time

### Health Checks

**Endpoint: GET /health**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T12:00:00Z",
  "services": {
    "database": "connected",
    "mongodb": "connected",
    "redis": "connected",
    "ai_service": "connected"
  },
  "uptime": 86400
}
```

**Liveness Probe**: Check if service is running
**Readiness Probe**: Check if service can handle requests

### Alerting

**Critical Alerts**
- API error rate > 5%
- Database connection failures
- AI service unavailable
- Disk space > 90%
- Memory usage > 90%

**Warning Alerts**
- Response time > 1 second
- Error rate > 1%
- Slow queries > 500ms
- Cache hit rate < 80%


## Data Seeding Strategy

### Lesson Seeding Script

The system will include a seeding script to populate the database with 100 lesson levels. This script will:

1. Create lesson metadata for levels 1-100
2. Assign appropriate lesson types (vocabulary, grammar, speaking, listening, mixed)
3. Generate sample activities for each lesson
4. Upload media files to S3 and store URLs
5. Set XP rewards based on difficulty

**Lesson Distribution**
- Levels 1-20: Vocabulary (Basic words, phrases)
- Levels 21-40: Grammar (Tenses, sentence structure)
- Levels 41-60: Speaking (Pronunciation, conversation)
- Levels 61-80: Listening (Comprehension, dictation)
- Levels 81-100: Mixed (Advanced integrated skills)

**XP Rewards**
- Levels 1-20: 50 XP
- Levels 21-40: 75 XP
- Levels 41-60: 100 XP
- Levels 61-80: 125 XP
- Levels 81-100: 150 XP

**Sample Seed Script**
```typescript
async function seedLessons() {
  const lessons = [];
  
  for (let level = 1; level <= 100; level++) {
    const lessonType = getLessonType(level);
    const xpReward = getXpReward(level);
    
    lessons.push({
      level,
      title: `Lesson ${level}: ${getLessonTitle(level)}`,
      type: lessonType,
      xpReward,
      content: generateActivities(level, lessonType),
      mediaUrls: generateMediaUrls(level)
    });
  }
  
  await prisma.lesson.createMany({ data: lessons });
  console.log('Seeded 100 lessons successfully');
}
```

### Badge Seeding

**Achievement Badges**
- "First Steps" - Complete first lesson
- "Week Warrior" - 7-day streak
- "Month Master" - 30-day streak
- "Level 10" - Reach level 10
- "Level 25" - Reach level 25
- "Level 50" - Reach level 50
- "Level 100" - Complete all lessons
- "Speaking Star" - Complete 20 speaking activities
- "Grammar Guru" - Complete 20 grammar activities
- "AI Conversationalist" - 50 AI chat sessions


## API Documentation

### Documentation Tools
- Swagger/OpenAPI for REST API documentation
- Auto-generated from code annotations
- Interactive API testing interface
- Available at `/api-docs` endpoint

### Sample Swagger Configuration

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Accentaura API',
      version: '1.0.0',
      description: 'Backend API for Accentaura language learning app',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.accentaura.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Example Endpoint Documentation

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
```

## Conclusion

This design document provides a comprehensive blueprint for building the Accentaura backend system. The architecture is designed to be scalable, secure, and maintainable, with clear separation of concerns between the main API and AI microservice. The use of modern technologies like TypeScript, Prisma, FastAPI, and Google Gemini Pro ensures a robust and future-proof implementation.

Key design decisions include:
- Microservices architecture for independent scaling
- JWT-based authentication with refresh tokens
- PostgreSQL for relational data, MongoDB for logs
- Redis caching for performance
- Comprehensive error handling and monitoring
- Security-first approach with bcrypt, HTTPS, and input validation
- Horizontal scaling support with stateless API design

The next step is to create an implementation plan that breaks down this design into actionable development tasks.
