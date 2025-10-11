# Mobile App - Backend Integration Guide

## ✅ Integration Complete

Mobile app ab successfully backend ke saath integrated hai!

### Backend URL Configuration

**Production Backend:** `https://accentaura-api.onrender.com`

### Environment Configuration

Mobile app mein 3 environments configured hain:

#### 1. Development (Local Testing)
```dart
apiBaseUrl: 'http://10.0.2.2:3000/v1'  // Android emulator
// iOS simulator: 'http://localhost:3000/v1'
// Physical device: 'http://YOUR_IP:3000/v1'
```

#### 2. Staging
```dart
apiBaseUrl: 'https://accentaura-api.onrender.com/v1'
```

#### 3. Production
```dart
apiBaseUrl: 'https://accentaura-api.onrender.com/v1'
```

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Mobile App Usage |
|----------|--------|-------------|------------------|
| `/v1/auth/signup` | POST | Register new user | ✅ Implemented |
| `/v1/auth/login` | POST | Email/password login | ✅ Implemented |
| `/v1/auth/oauth` | POST | Google/Facebook login | ✅ Implemented |
| `/v1/auth/refresh` | POST | Refresh access token | ✅ Implemented |
| `/v1/auth/validate` | POST | Validate JWT token | ✅ Implemented |
| `/v1/auth/logout` | POST | Logout user | ✅ Implemented |
| `/v1/auth/profile` | GET | Get user profile | ✅ Implemented |

### Lesson Endpoints

| Endpoint | Method | Description | Mobile App Usage |
|----------|--------|-------------|------------------|
| `/v1/lessons` | GET | Get lessons range | ✅ Implemented |
| `/v1/lessons/:level` | GET | Get specific lesson | ✅ Implemented |

### Progress Endpoints

| Endpoint | Method | Description | Mobile App Usage |
|----------|--------|-------------|------------------|
| `/v1/progress` | POST | Save user progress | ✅ Implemented |
| `/v1/progress/:userId` | GET | Get user progress | ✅ Implemented |

### AI Endpoints

| Endpoint | Method | Description | Mobile App Usage |
|----------|--------|-------------|------------------|
| `/v1/ai/chat` | POST | Chat with AI | ✅ Implemented |
| `/v1/ai/analyze-speech` | POST | Analyze speech audio | ✅ Implemented |
| `/v1/ai/interview/start` | POST | Start interview | ✅ Implemented |
| `/v1/ai/interview/submit` | POST | Submit interview | ✅ Implemented |

### Leaderboard Endpoints

| Endpoint | Method | Description | Mobile App Usage |
|----------|--------|-------------|------------------|
| `/v1/leaderboard` | GET | Get leaderboard | ✅ Implemented |
| `/v1/leaderboard/rank/:userId` | GET | Get user rank | ✅ Implemented |

---

## Testing the Integration

### 1. Test Backend Health

```bash
# Root endpoint
curl https://accentaura-api.onrender.com/

# Health check
curl https://accentaura-api.onrender.com/health

# Expected response:
# {
#   "status": "healthy" or "degraded",
#   "services": {
#     "mongodb_prisma": {"status": "connected"},
#     "mongodb": {"status": "connected"},
#     "redis": {"status": "connected"}
#   }
# }
```

### 2. Test Authentication

```bash
# Register new user
curl -X POST https://accentaura-api.onrender.com/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST https://accentaura-api.onrender.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Test Mobile App

#### Run in Development Mode (Local Backend)
```bash
cd accentaura_mobile_app
flutter run
```

#### Run in Production Mode (Render Backend)
```bash
cd accentaura_mobile_app
flutter run --dart-define=ENV=production
```

#### Run in Staging Mode
```bash
cd accentaura_mobile_app
flutter run --dart-define=ENV=staging
```

---

## Mobile App Features

### ✅ Implemented Features

1. **Authentication**
   - Email/Password registration and login
   - Google OAuth login
   - Facebook OAuth login
   - Token management (access + refresh tokens)
   - Secure token storage (FlutterSecureStorage)
   - Auto token refresh
   - Session restoration

2. **API Service**
   - Dio HTTP client with interceptors
   - Automatic retry with exponential backoff
   - Error handling (401, 404, 500, timeout)
   - Request/response logging
   - Bearer token authentication

3. **Error Handling**
   - Network errors
   - Timeout errors
   - Server errors (5xx)
   - Client errors (4xx)
   - OAuth errors

4. **Security**
   - Secure token storage
   - HTTPS only in production
   - Token validation
   - Auto logout on 401

---

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=30d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# AI Service
FASTAPI_URL=https://your-ai-service-url

# Server
PORT=3000
NODE_ENV=production
```

### Mobile App
No environment variables needed - configuration is in `lib/core/config/environment.dart`

---

## Known Issues & Solutions

### 1. AI Service Disconnected
**Issue:** Health check shows `ai_service: disconnected`

**Solution:** AI microservice needs to be deployed separately. Backend will work without it, but AI features won't be available.

**Deploy AI Service:**
```bash
cd accentaura-backend/ai-microservice
# Deploy to Render, Railway, or other Python hosting
```

### 2. CORS Errors
**Issue:** Browser/mobile app shows CORS errors

**Solution:** Backend already has CORS configured in `src/middlewares/cors.middleware.ts`. If issues persist, check allowed origins.

### 3. Token Expiration
**Issue:** User gets logged out frequently

**Solution:** Mobile app automatically refreshes tokens. Check `JWT_EXPIRES_IN` in backend .env (currently 7 days).

### 4. Network Timeout
**Issue:** Requests timeout on slow connections

**Solution:** Mobile app has 30s timeout with automatic retry. Adjust in `api_service.dart` if needed.

---

## Next Steps

### 1. Deploy AI Microservice
```bash
cd accentaura-backend/ai-microservice
# Follow deployment guide for Python FastAPI app
```

### 2. Test Mobile App Features
- [ ] User registration
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] Facebook OAuth login
- [ ] Fetch lessons
- [ ] Save progress
- [ ] View leaderboard
- [ ] AI chat
- [ ] Speech analysis
- [ ] Interview practice

### 3. Production Checklist
- [x] Backend deployed to Render
- [x] MongoDB connected
- [x] Redis connected
- [x] Environment variables configured
- [x] Mobile app integrated
- [ ] AI microservice deployed
- [ ] OAuth credentials configured
- [ ] SSL/HTTPS enabled
- [ ] Error monitoring (Sentry/DataDog)
- [ ] Analytics configured

---

## Support

### Backend Logs
```bash
# View Render logs
https://dashboard.render.com/web/srv-xxx/logs
```

### Mobile App Debugging
```bash
# Enable verbose logging
flutter run --verbose

# Check API calls
# Logs are in console with tag: [ApiService]
```

### Common Commands
```bash
# Backend
cd accentaura-backend
npm run dev          # Local development
npm run build        # Build for production
npm test            # Run tests

# Mobile App
cd accentaura_mobile_app
flutter run         # Run app
flutter test        # Run tests
flutter doctor      # Check setup
```

---

## API Response Examples

### Successful Login
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User",
    "profilePicture": null
  },
  "progress": {
    "currentLevel": 1,
    "totalXP": 0,
    "streak": 0,
    "completedLessons": []
  }
}
```

### Error Response
```json
{
  "message": "Invalid email or password",
  "statusCode": 401
}
```

---

## 🎉 Integration Complete!

Mobile app ab production backend ke saath fully integrated hai. Users ab register kar sakte hain, login kar sakte hain, aur app use kar sakte hain!
