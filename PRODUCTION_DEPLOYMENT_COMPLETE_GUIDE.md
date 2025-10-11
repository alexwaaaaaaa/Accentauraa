# 🚀 AccentAura - Complete Production Deployment Guide

One-stop guide for deploying both backend and mobile app to production using free-tier services.

## 📋 Quick Overview

### Total Cost: ~$124/year
- Backend: **FREE** (Render/Railway + Neon + MongoDB Atlas + Upstash)
- Android: **$25** one-time (Google Play Store)
- iOS: **$99/year** (Apple Developer Program)

### Timeline
- Backend Setup: **2-3 hours**
- Mobile App Setup: **4-6 hours**
- Store Review: **2-3 days** (Android), **1-2 days** (iOS)

---

## 🎯 Phase 1: Backend Deployment (2-3 hours)

### Step 1: Setup Databases (30 min)

```bash
# 1. PostgreSQL on Neon (https://neon.tech)
# - Sign up with GitHub
# - Create project: accentaura-prod
# - Copy connection string

# 2. MongoDB Atlas (https://mongodb.com/cloud/atlas)
# - Sign up, create M0 free cluster
# - Setup user and network access (0.0.0.0/0)
# - Copy connection string

# 3. Upstash Redis (https://upstash.com)
# - Sign up with GitHub
# - Create database: accentaura-redis
# - Copy connection string
```

### Step 2: Deploy Backend on Render (1 hour)

```bash
# 1. Create Render account (https://render.com)
# - Sign up with GitHub

# 2. Deploy Main API
# - New > Web Service
# - Connect repo: accentaura-backend
# - Name: accentaura-api
# - Build: npm ci && npm run build
# - Start: npm start
# - Add environment variables (see below)

# 3. Deploy AI Service
# - New > Web Service
# - Same repo, root: ai-microservice
# - Name: accentaura-ai
# - Build: pip install -r requirements.txt
# - Start: uvicorn main:app --host 0.0.0.0 --port $PORT
# - Add GEMINI_API_KEY
```

### Environment Variables for Main API

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/accentaura?sslmode=require
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/accentaura
REDIS_URL=redis://default:pass@endpoint.upstash.io:6379
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
GEMINI_API_KEY=<your-key>
FASTAPI_URL=https://accentaura-ai.onrender.com
CORS_ORIGINS=https://accentaura-api.onrender.com
```

### Step 3: Run Migrations (15 min)

```bash
# In Render Shell or locally:
export DATABASE_URL="postgresql://..."
cd accentaura-backend
npx prisma migrate deploy
npm run seed:all
```

### Step 4: Verify Deployment (15 min)

```bash
# Test health endpoint
curl https://accentaura-api.onrender.com/health

# Test registration
curl -X POST https://accentaura-api.onrender.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'

# Test AI service
curl https://accentaura-ai.onrender.com/health
```

### Step 5: Setup Monitoring (30 min)

```bash
# 1. Grafana Cloud (https://grafana.com)
# - Sign up, create stack
# - Setup Prometheus remote write

# 2. Add metrics to backend
npm install prom-client express-prom-bundle

# 3. Setup alerts
# - High error rate
# - Slow response time
# - Service downtime
```

---

## 🎯 Phase 2: Mobile App Deployment (4-6 hours)

### Step 1: Update Configuration (30 min)

```dart
// lib/core/config/environment.dart
static const production = EnvironmentConfig(
  environment: Environment.production,
  apiBaseUrl: 'https://accentaura-api.onrender.com',
  enableLogging: false,
  enableAnalytics: true,
);
```

```yaml
# pubspec.yaml
version: 1.0.0+1
```

### Step 2: Android Deployment (2-3 hours)

```bash
# 1. Generate signing key (10 min)
cd android
keytool -genkey -v -keystore accentaura-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias accentaura

# 2. Create key.properties (5 min)
cat > key.properties << EOF
storePassword=<your-password>
keyPassword=<your-password>
keyAlias=accentaura
storeFile=accentaura-release-key.jks
EOF

# 3. Build App Bundle (10 min)
cd ..
flutter build appbundle \
  --flavor production \
  --target lib/main_production.dart \
  --release

# 4. Create Play Store account (30 min)
# - Go to https://play.google.com/console
# - Pay $25 one-time fee
# - Create app

# 5. Prepare assets (1 hour)
# - App icon: 512x512 PNG
# - Feature graphic: 1024x500 PNG
# - Screenshots: At least 2
# - Privacy policy URL

# 6. Fill store listing (30 min)
# - App name, description
# - Category, tags
# - Contact details
# - Content rating

# 7. Upload and submit (15 min)
# - Upload AAB file
# - Add release notes
# - Submit for review
# - Wait 2-3 days
```

### Step 3: iOS Deployment (2-3 hours)

```bash
# 1. Apple Developer account (30 min)
# - Go to https://developer.apple.com/programs/
# - Pay $99/year
# - Wait 1-2 days for verification

# 2. Configure Xcode (15 min)
cd ios
open Runner.xcworkspace
# - Select Runner target
# - Signing & Capabilities
# - Select your team
# - Bundle ID: com.accentaura.accentauraMobileApp

# 3. Build IPA (10 min)
cd ..
flutter build ipa \
  --flavor production \
  --target lib/main_production.dart \
  --release

# 4. Create app in App Store Connect (30 min)
# - Go to https://appstoreconnect.apple.com
# - Create new app
# - Fill app information

# 5. Prepare assets (1 hour)
# - App icon: 1024x1024 PNG
# - Screenshots for different sizes
# - Privacy policy URL

# 6. Upload build (15 min)
# - Use Xcode Organizer or Transporter
# - Upload IPA file

# 7. Submit for review (15 min)
# - Select build
# - Fill review information
# - Submit
# - Wait 1-2 days
```

### Step 4: Firebase Setup (30 min)

```bash
# 1. Create Firebase project
# - Go to https://console.firebase.google.com
# - Create project: AccentAura

# 2. Add Android app
# - Package: com.accentaura.accentaura_mobile_app
# - Download google-services.json
# - Place in android/app/

# 3. Add iOS app
# - Bundle ID: com.accentaura.accentauraMobileApp
# - Download GoogleService-Info.plist
# - Place in ios/Runner/

# 4. Enable services
# - Authentication (Email, Google)
# - Analytics
# - Crashlytics
```

---

## 🎯 Phase 3: CI/CD Setup (1 hour)

### GitHub Actions for Backend

```yaml
# .github/workflows/backend-deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Render Deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### GitHub Actions for Mobile

```yaml
# .github/workflows/mobile-deploy.yml
name: Deploy Mobile

on:
  push:
    tags:
      - 'v*'

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build appbundle --flavor production --release
      # Upload to Play Store

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build ipa --flavor production --release
      # Upload to TestFlight
```

---

## 🎯 Phase 4: Post-Deployment (Ongoing)

### Daily Tasks
- [ ] Check error logs in Render
- [ ] Monitor Grafana dashboards
- [ ] Review crash reports (Firebase Crashlytics)
- [ ] Check app store reviews

### Weekly Tasks
- [ ] Review analytics (user growth, retention)
- [ ] Check database storage usage
- [ ] Review API performance metrics
- [ ] Respond to user feedback

### Monthly Tasks
- [ ] Database backup verification
- [ ] Security audit (npm audit, flutter pub outdated)
- [ ] Performance optimization review
- [ ] Plan feature updates

---

## 📊 Monitoring Checklist

### Backend Health
```bash
# API Health
curl https://accentaura-api.onrender.com/health

# Metrics
curl https://accentaura-api.onrender.com/metrics

# Logs
# Check Render Dashboard > Logs
```

### Mobile App Health
```bash
# Firebase Console
# - Crashlytics: Check crash-free rate (target: >99%)
# - Analytics: Check DAU/MAU ratio
# - Performance: Check app start time

# Play Console
# - Vitals: Check ANR rate, crash rate
# - Pre-launch report: Check compatibility

# App Store Connect
# - Crashes: Check crash rate
# - Energy: Check battery usage
```

---

## 🚨 Troubleshooting

### Backend Issues

**Service won't start**
```bash
# Check logs in Render Dashboard
# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port binding issue

# Solution:
# - Verify all env vars
# - Test DATABASE_URL locally
# - Ensure PORT from process.env.PORT
```

**Database connection timeout**
```bash
# Neon issue:
# - Check connection string format
# - Ensure ?sslmode=require

# Solution:
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
npx prisma db push
```

**AI service 502 error**
```bash
# Cold start issue
# - First request after sleep is slow

# Solution:
# - Setup keep-alive cron job
# - Increase timeout in Render settings
```

### Mobile App Issues

**Android build fails**
```bash
# Gradle issue
flutter clean
flutter pub get
cd android && ./gradlew clean && cd ..
flutter build appbundle --flavor production --release
```

**iOS build fails**
```bash
# CocoaPods issue
cd ios
pod deintegrate
pod install --repo-update
cd ..
flutter build ipa --flavor production --release
```

**App rejected from store**
```bash
# Common reasons:
# - Missing privacy policy
# - Incomplete metadata
# - Crashes on launch
# - Missing permissions descriptions

# Solution:
# - Read rejection email carefully
# - Fix issues mentioned
# - Resubmit
```

---

## 📚 Important URLs

### Backend
- **API**: https://accentaura-api.onrender.com
- **AI Service**: https://accentaura-ai.onrender.com
- **Render Dashboard**: https://dashboard.render.com
- **Neon Console**: https://console.neon.tech
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Upstash Console**: https://console.upstash.com
- **Grafana**: https://grafana.com

### Mobile
- **Play Console**: https://play.google.com/console
- **App Store Connect**: https://appstoreconnect.apple.com
- **Firebase Console**: https://console.firebase.google.com
- **TestFlight**: https://testflight.apple.com

### Documentation
- **Backend Deployment**: `accentaura-backend/PRODUCTION_DEPLOYMENT_FREE_TIER.md`
- **Mobile Deployment**: `accentaura_mobile_app/PRODUCTION_DEPLOYMENT_FREE.md`
- **API Docs**: `accentaura-backend/API_DOCUMENTATION.md`

---

## 🎉 Success Checklist

### Backend ✅
- [ ] API deployed and accessible
- [ ] AI service deployed and accessible
- [ ] Databases connected (PostgreSQL, MongoDB, Redis)
- [ ] Migrations run successfully
- [ ] Database seeded with initial data
- [ ] Health checks passing
- [ ] Monitoring setup (Grafana)
- [ ] CI/CD pipeline working
- [ ] SSL certificate active
- [ ] CORS configured correctly

### Mobile App ✅
- [ ] Android app on Play Store
- [ ] iOS app on App Store
- [ ] Firebase configured
- [ ] Analytics tracking
- [ ] Crash reporting enabled
- [ ] Push notifications setup (optional)
- [ ] Deep linking configured (optional)
- [ ] App connects to production API
- [ ] All features tested on production
- [ ] Store listings complete

### Operations ✅
- [ ] Monitoring dashboards setup
- [ ] Alert rules configured
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team access configured
- [ ] Support email setup
- [ ] Privacy policy published
- [ ] Terms of service published

---

## 💰 Cost Breakdown

### Free Tier (First Year)
| Service | Cost | Limits |
|---------|------|--------|
| Render (Backend) | $0 | 512MB RAM, sleeps after 15min |
| Neon (PostgreSQL) | $0 | 3GB storage |
| MongoDB Atlas | $0 | 512MB storage |
| Upstash Redis | $0 | 10K commands/day |
| Grafana Cloud | $0 | 10K metrics |
| GitHub Actions | $0 | 2000 min/month |
| Firebase | $0 | Spark plan |
| **Play Store** | **$25** | One-time |
| **App Store** | **$99** | Per year |
| **Total Year 1** | **$124** | |

### Paid Tier (When Scaling)
| Service | Cost/month | Benefits |
|---------|------------|----------|
| Render Starter | $7 | No sleep, 512MB RAM |
| Neon Pro | $19 | 10GB storage, better performance |
| MongoDB M2 | $9 | 2GB RAM, better performance |
| Upstash Pro | $10 | Unlimited commands |
| **Total/month** | **$45** | **$540/year** |

---

## 🚀 Next Steps

1. **Launch Marketing**
   - Create landing page
   - Social media presence
   - Product Hunt launch
   - App Store Optimization (ASO)

2. **User Feedback**
   - Setup feedback form
   - Monitor reviews
   - User surveys
   - Beta testing program

3. **Feature Development**
   - Prioritize based on feedback
   - A/B testing
   - Performance optimization
   - New lesson content

4. **Growth**
   - Referral program
   - Content marketing
   - Partnerships
   - Paid advertising

---

## 📞 Support

- **Documentation**: Check deployment guides
- **Issues**: Create GitHub issue
- **Email**: support@accentaura.com
- **Community**: Join Discord/Slack

---

**Last Updated**: 2025-01-10  
**Version**: 1.0.0  
**Maintained By**: AccentAura Team

**Good luck with your launch! 🎉**
