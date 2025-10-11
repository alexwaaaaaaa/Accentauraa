# AI Microservice Deployment Guide

## 🚀 Deploy to Render (Free Tier)

### Prerequisites
- Render account (https://render.com)
- Google Gemini API key (https://makersuite.google.com/app/apikey)

---

## Step 1: Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the API key (starts with `AIza...`)
4. Keep it safe - you'll need it for deployment

---

## Step 2: Deploy to Render

### Option A: Deploy from GitHub (Recommended)

1. **Push Code to GitHub**
   ```bash
   cd accentaura-backend/ai-microservice
   git add .
   git commit -m "Add AI microservice"
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `Accentauraa` repository

3. **Configure Service**
   - **Name:** `accentaura-ai-service`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `accentaura-backend/ai-microservice`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`

4. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable":
   
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `ALLOWED_ORIGINS` | `https://accentaura-api.onrender.com,http://localhost:3000` |
   | `PYTHON_VERSION` | `3.11.0` |

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note the service URL (e.g., `https://accentaura-ai-service.onrender.com`)

### Option B: Deploy with render.yaml

1. **Use Blueprint**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select `Accentauraa` repository
   - Render will detect `render.yaml` in `ai-microservice` folder

2. **Configure Environment Variables**
   - Add `GEMINI_API_KEY` in the Render dashboard
   - Other variables are pre-configured in `render.yaml`

3. **Deploy**
   - Click "Apply"
   - Wait for deployment

---

## Step 3: Update Backend Configuration

After AI service is deployed, update the main backend:

1. **Get AI Service URL**
   - From Render dashboard, copy your AI service URL
   - Example: `https://accentaura-ai-service.onrender.com`

2. **Update Backend Environment Variable**
   - Go to main backend service on Render
   - Add/Update environment variable:
     ```
     FASTAPI_URL=https://accentaura-ai-service.onrender.com
     ```

3. **Redeploy Backend**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or push a new commit to trigger auto-deploy

---

## Step 4: Test AI Service

### Test Health Endpoint
```bash
curl https://accentaura-ai-service.onrender.com/health
```

Expected response:
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
  -d '{
    "prompt": "Hello! Can you help me practice English?"
  }'
```

Expected response:
```json
{
  "response": "Hello! I'd be happy to help you practice English...",
  "conversationId": "uuid-here"
}
```

### Test from Main Backend
```bash
curl https://accentaura-api.onrender.com/health
```

Check that `ai_service` status is now "connected":
```json
{
  "services": {
    "ai_service": {
      "status": "connected"
    }
  }
}
```

---

## Troubleshooting

### Issue: "GEMINI_API_KEY not found"
**Solution:** 
- Check environment variable is set in Render dashboard
- Ensure variable name is exactly `GEMINI_API_KEY`
- Redeploy service after adding variable

### Issue: "Failed to connect to AI service"
**Solution:**
- Verify AI service is running (check Render logs)
- Check `FASTAPI_URL` in main backend is correct
- Ensure no typos in URL (include `https://`)
- Wait 30s for cold start on free tier

### Issue: "Health check failing"
**Solution:**
- Check Render logs for errors
- Verify Python dependencies installed correctly
- Ensure port is set to `$PORT` (Render provides this)

### Issue: "CORS errors"
**Solution:**
- Add your frontend URL to `ALLOWED_ORIGINS`
- Format: `https://domain1.com,https://domain2.com`
- No spaces between URLs

---

## Performance Notes

### Free Tier Limitations
- **Cold Start:** 30-60 seconds after inactivity
- **Memory:** 512 MB
- **CPU:** Shared
- **Bandwidth:** 100 GB/month
- **Build Minutes:** 500/month

### Optimization Tips
1. **Keep Service Warm:** Use a cron job to ping every 10 minutes
2. **Upgrade Plan:** Consider paid plan for production ($7/month)
3. **Caching:** Implement response caching for common queries
4. **Monitoring:** Add health check monitoring

---

## Monitoring

### View Logs
```bash
# From Render dashboard
Dashboard → Your Service → Logs
```

### Health Check
```bash
# Automated health check
curl https://accentaura-ai-service.onrender.com/health
```

### Metrics
- Response time
- Error rate
- Request count
- Available in Render dashboard

---

## Scaling

### When to Upgrade

Upgrade from free tier when:
- Cold starts affect user experience
- Need more than 512 MB memory
- Require 99.9% uptime
- Need faster response times

### Paid Plans
- **Starter:** $7/month - No cold starts, 512 MB
- **Standard:** $25/month - 2 GB RAM, better CPU
- **Pro:** $85/month - 4 GB RAM, dedicated CPU

---

## Security

### API Key Protection
- ✅ Never commit API keys to Git
- ✅ Use environment variables
- ✅ Rotate keys periodically
- ✅ Monitor API usage

### CORS Configuration
- ✅ Only allow trusted origins
- ✅ Update `ALLOWED_ORIGINS` for production
- ✅ Don't use `*` wildcard in production

### Rate Limiting
- Consider adding rate limiting for production
- Protect against abuse
- Monitor API usage

---

## Cost Estimation

### Free Tier (Current)
- **Cost:** $0/month
- **Limitations:** Cold starts, 512 MB RAM
- **Best for:** Development, testing, low traffic

### Paid Tier (Recommended for Production)
- **Cost:** $7/month (Starter plan)
- **Benefits:** No cold starts, always on
- **Best for:** Production, better UX

### Gemini API
- **Free Tier:** 60 requests/minute
- **Cost:** Free for moderate usage
- **Monitor:** Check usage at https://makersuite.google.com

---

## Next Steps

1. ✅ Deploy AI service to Render
2. ✅ Update backend `FASTAPI_URL`
3. ✅ Test all AI endpoints
4. ✅ Monitor performance
5. ⚠️ Consider upgrading for production
6. ⚠️ Set up monitoring/alerts
7. ⚠️ Implement caching

---

## Support

### Documentation
- FastAPI: https://fastapi.tiangolo.com
- Gemini API: https://ai.google.dev/docs
- Render: https://render.com/docs

### Issues
- Check Render logs first
- Test endpoints with curl
- Verify environment variables
- Check Gemini API quota

---

**Deployment URL:** https://accentaura-ai-service.onrender.com (after deployment)

**Status:** Ready to deploy! 🚀
