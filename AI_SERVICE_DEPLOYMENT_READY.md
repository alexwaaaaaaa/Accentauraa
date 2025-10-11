# 🤖 AI Microservice - Ready for Deployment

## ✅ Preparation Complete

AI microservice ab deploy karne ke liye ready hai!

---

## 📦 What's Included

### AI Service Features
- ✅ **Chat with AI** - Conversational English practice
- ✅ **Speech Analysis** - Audio feedback with pronunciation
- ✅ **Confidence Analysis** - Text confidence scoring
- ✅ **Interview Analysis** - Comprehensive interview feedback
- ✅ **Health Monitoring** - Service health checks

### Technology Stack
- **Framework:** FastAPI (Python)
- **AI Model:** Google Gemini 2.0 Flash
- **Runtime:** Python 3.11
- **Deployment:** Render (Free Tier)

---

## 🚀 Quick Deployment Steps

### 1. Get Gemini API Key (Free)

```bash
# Visit Google AI Studio
https://makersuite.google.com/app/apikey

# Click "Create API Key"
# Copy the key (starts with AIza...)
```

### 2. Deploy to Render

**Option A: Via Dashboard (Easiest)**

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository: `Accentauraa`
4. Configure:
   - **Root Directory:** `accentaura-backend/ai-microservice`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

5. Add Environment Variables:
   ```
   GEMINI_API_KEY = your_api_key_here
   ALLOWED_ORIGINS = https://accentaura-api.onrender.com
   PYTHON_VERSION = 3.11.0
   ```

6. Click "Create Web Service"

**Option B: Via Blueprint**

1. Push code to GitHub
2. Render will auto-detect `render.yaml`
3. Add `GEMINI_API_KEY` in dashboard
4. Deploy

### 3. Update Main Backend

After AI service deploys:

1. Get AI service URL from Render (e.g., `https://accentaura-ai-service.onrender.com`)
2. Go to main backend service on Render
3. Add environment variable:
   ```
   FASTAPI_URL = https://accentaura-ai-service.onrender.com
   ```
4. Redeploy main backend

---

## 🧪 Testing

### Test AI Service Health
```bash
curl https://accentaura-ai-service.onrender.com/health
```

Expected:
```json
{
  "status": "healthy",
  "gemini_api": "connected"
}
```

### Test Chat Endpoint
```bash
curl -X POST https://accentaura-ai-service.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello! Help me practice English."}'
```

### Test Main Backend Integration
```bash
curl https://accentaura-api.onrender.com/health
```

Check `ai_service` status should be "connected"

---

## 📁 Files Created

```
accentaura-backend/ai-microservice/
├── main.py                    # ✅ FastAPI application
├── requirements.txt           # ✅ Python dependencies
├── Dockerfile                 # ✅ Docker configuration
├── render.yaml               # ✅ Render deployment config
├── DEPLOYMENT_GUIDE.md       # ✅ Detailed deployment guide
├── deploy.sh                 # ✅ Deployment helper script
├── .env.example              # ✅ Environment template
└── tests/                    # ✅ Test suite
    ├── test_chat.py
    ├── test_speech_analysis.py
    ├── test_confidence_analysis.py
    └── test_interview_analysis.py
```

---

## 🎯 API Endpoints

### Health Check
```
GET /health
```

### Chat with AI
```
POST /chat
Body: { "prompt": "string", "conversationId": "string?" }
```

### Analyze Speech
```
POST /analyze/speech
Body: FormData with audio file
```

### Analyze Confidence
```
POST /analyze/confidence
Body: { "text": "string" }
```

### Analyze Interview
```
POST /interview/analyze
Body: FormData with audio (required) and video (optional)
```

---

## 💰 Cost Breakdown

### Free Tier (Current Setup)
- **Render:** $0/month (Free tier)
- **Gemini API:** $0/month (Free tier - 60 req/min)
- **Total:** $0/month

### Limitations
- Cold start: 30-60 seconds after inactivity
- 512 MB RAM
- 100 GB bandwidth/month

### Recommended for Production
- **Render Starter:** $7/month (no cold starts)
- **Gemini API:** Still free for moderate usage
- **Total:** $7/month

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `ALLOWED_ORIGINS` | ⚠️ Recommended | CORS allowed origins |
| `PORT` | ❌ No | Auto-set by Render |
| `PYTHON_VERSION` | ⚠️ Recommended | Python version (3.11.0) |

### CORS Configuration

Default allowed origins:
- `http://localhost:3000` (development)
- `https://accentaura-api.onrender.com` (production backend)

Add more origins as needed:
```
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

---

## 📊 Performance

### Response Times (Expected)
- Health check: < 100ms
- Chat: 1-3 seconds
- Speech analysis: 3-5 seconds
- Interview analysis: 5-10 seconds

### Optimization Tips
1. Use caching for common queries
2. Implement request queuing
3. Add CDN for static assets
4. Upgrade to paid plan for production

---

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not found"
**Solution:** Add environment variable in Render dashboard

### Issue: "Cold start taking too long"
**Solution:** 
- Expected on free tier (30-60s)
- Upgrade to Starter plan ($7/month)
- Implement keep-alive pings

### Issue: "CORS errors"
**Solution:** Add your domain to `ALLOWED_ORIGINS`

### Issue: "Health check failing"
**Solution:** 
- Check Render logs
- Verify Gemini API key is valid
- Ensure dependencies installed correctly

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_GUIDE.md](accentaura-backend/ai-microservice/DEPLOYMENT_GUIDE.md) | Complete deployment instructions |
| [README.md](accentaura-backend/ai-microservice/README.md) | API documentation |
| [deploy.sh](accentaura-backend/ai-microservice/deploy.sh) | Automated deployment helper |

---

## 🎓 Usage Examples

### From Mobile App

```dart
// Chat with AI
final response = await apiService.sendChatMessage(
  "How do I improve my pronunciation?"
);

// Analyze speech
final analysis = await apiService.analyzeSpeech(audioFile);

// Start interview
final session = await apiService.startInterview();
```

### From Backend

```typescript
// Call AI service from Node.js backend
const response = await axios.post(
  `${process.env.FASTAPI_URL}/chat`,
  { prompt: "Hello!" }
);
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [x] Code ready and tested
- [x] Dependencies listed in requirements.txt
- [x] Dockerfile configured
- [x] render.yaml created
- [x] Environment variables documented
- [x] Tests passing

### Deployment
- [ ] Get Gemini API key
- [ ] Create Render web service
- [ ] Configure environment variables
- [ ] Deploy service
- [ ] Test health endpoint
- [ ] Test API endpoints

### Post-Deployment
- [ ] Update main backend FASTAPI_URL
- [ ] Test integration with main backend
- [ ] Monitor logs for errors
- [ ] Test from mobile app
- [ ] Set up monitoring/alerts

---

## 🚦 Status

**Current Status:** ✅ Ready for Deployment

**Next Action:** Deploy to Render

**Estimated Time:** 10-15 minutes

---

## 🎉 Benefits After Deployment

Once deployed, users will be able to:
- ✅ Chat with AI for English practice
- ✅ Get speech feedback with pronunciation tips
- ✅ Analyze text confidence
- ✅ Practice mock interviews with AI feedback
- ✅ Receive personalized learning suggestions

---

## 📞 Support

### Get Help
- **Render Docs:** https://render.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Gemini API Docs:** https://ai.google.dev/docs

### Common Issues
- Check Render logs first
- Verify environment variables
- Test endpoints with curl
- Check Gemini API quota

---

## 🎯 Next Steps

1. **Get Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Create and copy key

2. **Deploy to Render**
   - Follow DEPLOYMENT_GUIDE.md
   - Or run: `./deploy.sh` for pre-deployment checks

3. **Update Main Backend**
   - Add FASTAPI_URL environment variable
   - Redeploy main backend

4. **Test Integration**
   - Test health endpoints
   - Test AI features from mobile app
   - Monitor performance

---

**Deployment Guide:** [DEPLOYMENT_GUIDE.md](accentaura-backend/ai-microservice/DEPLOYMENT_GUIDE.md)

**Status:** 🟢 Ready to Deploy!

**Estimated Cost:** $0/month (Free tier) or $7/month (Production)
