# 🚀 Render Deployment - Step by Step

## ✅ Cleanup Done!
- Deleted 20+ useless documentation files
- Kept all tests (important for quality)
- Kept all source code
- Created render.yaml for easy deployment

## 📝 Next Steps (Tum Manually Karo):

### Step 1: GitHub Repository Setup
```bash
cd accentaura-backend

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Clean backend ready for Render deployment"

# Create GitHub repo and push
# Go to: https://github.com/new
# Name: accentaura-backend
# Then:
git remote add origin https://github.com/YOUR_USERNAME/accentaura-backend.git
git branch -M main
git push -u origin main
```

### Step 2: Setup Free Databases

#### MongoDB Atlas (Free 512MB)
1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up / Login
3. Create Free Cluster (M0)
4. Database Access → Add User (username + password)
5. Network Access → Add IP: `0.0.0.0/0` (allow all)
6. Copy connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/accentaura
   ```

#### Upstash Redis (Free 10K commands/day)
1. Go to: https://upstash.com
2. Sign up with GitHub
3. Create Database → Regional → Choose region
4. Copy Redis URL:
   ```
   redis://default:password@endpoint.upstash.io:6379
   ```

### Step 3: Deploy to Render

#### Deploy Main API
1. Go to: https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect your GitHub repo: `accentaura-backend`
5. Settings:
   - **Name**: `accentaura-api`
   - **Environment**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

6. **Environment Variables** (Add these):
   ```
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=<paste-your-mongodb-url>
   REDIS_URL=<paste-your-redis-url>
   JWT_SECRET=<generate-random-32-chars>
   JWT_REFRESH_SECRET=<generate-random-32-chars>
   GEMINI_API_KEY=<your-gemini-key>
   FASTAPI_URL=https://accentaura-ai.onrender.com
   ```

7. Click **Create Web Service**
8. Wait 5-10 minutes for deployment
9. Your API URL: `https://accentaura-api.onrender.com`

#### Deploy AI Microservice
1. In Render Dashboard → New → Web Service
2. Same GitHub repo: `accentaura-backend`
3. Settings:
   - **Name**: `accentaura-ai`
   - **Environment**: Python
   - **Root Directory**: `ai-microservice`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. **Environment Variables**:
   ```
   GEMINI_API_KEY=<your-gemini-key>
   ENVIRONMENT=production
   ```

5. Click **Create Web Service**
6. Your AI URL: `https://accentaura-ai.onrender.com`

### Step 4: Update Mobile App

Update `accentaura_mobile_app/lib/core/config/environment.dart`:

```dart
static const production = EnvironmentConfig(
  environment: Environment.production,
  apiBaseUrl: 'https://accentaura-api.onrender.com',  // ← Your Render URL
  apiKey: 'prod_api_key',
  enableLogging: false,
  enableAnalytics: true,
  enableCrashlytics: true,
);
```

### Step 5: Test Deployment

```bash
# Test API Health
curl https://accentaura-api.onrender.com/health

# Test AI Health
curl https://accentaura-ai.onrender.com/health

# Test Registration
curl -X POST https://accentaura-api.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Test"}'
```

## 🎉 Done!

Your backend is now live on:
- **API**: https://accentaura-api.onrender.com
- **AI**: https://accentaura-ai.onrender.com

## ⚠️ Important Notes

1. **Free Tier Sleeps**: Service sleeps after 15 min inactivity
2. **First Request Slow**: Takes 30-60 seconds to wake up
3. **MongoDB Limit**: 512MB storage
4. **Redis Limit**: 10K commands/day

## 🔧 Generate Secrets

```bash
# For JWT_SECRET and JWT_REFRESH_SECRET
openssl rand -hex 32
```

Run this twice to get two different secrets!
