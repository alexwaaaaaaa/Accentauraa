# AccentAura Backend

Node.js + TypeScript backend with Python AI microservice.

## 🚀 Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📦 Stack

- **API**: Node.js + Express + TypeScript
- **AI**: Python + FastAPI + Google Gemini
- **Database**: MongoDB
- **Cache**: Redis
- **Auth**: JWT

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run development server
npm run dev

# Run AI microservice
cd ai-microservice
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📝 Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/accentaura
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
GEMINI_API_KEY=your-gemini-api-key
FASTAPI_URL=http://localhost:8000
```

## 🚀 Production Deployment

1. Fork this repo
2. Sign up at [Render.com](https://render.com)
3. Click "Deploy to Render" button above
4. Add environment variables
5. Deploy!

## 📚 API Documentation

- **Health**: `GET /health`
- **Auth**: `POST /auth/login`, `POST /auth/signup`
- **Lessons**: `GET /lessons`
- **Progress**: `POST /progress`
- **AI**: `POST /ai/chat`, `POST /ai/analyze-speech`

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT
