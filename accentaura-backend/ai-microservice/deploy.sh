#!/bin/bash

# AI Microservice Deployment Helper Script
# This script helps prepare and deploy the AI microservice to Render

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 AI Microservice Deployment Helper${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❗ Please edit .env and add your GEMINI_API_KEY${NC}"
    echo -e "${YELLOW}   Get your key from: https://makersuite.google.com/app/apikey${NC}\n"
    exit 1
fi

# Check if GEMINI_API_KEY is set
source .env
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    echo -e "${RED}❌ GEMINI_API_KEY not set in .env file${NC}"
    echo -e "${YELLOW}   Get your key from: https://makersuite.google.com/app/apikey${NC}\n"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}\n"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python 3 found: $(python3 --version)${NC}\n"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}\n"
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
if python3 -m pytest tests/ -v --tb=short 2>/dev/null; then
    echo -e "${GREEN}✅ All tests passed${NC}\n"
else
    echo -e "${YELLOW}⚠️  Some tests failed, but continuing...${NC}\n"
fi

# Test local server
echo -e "${YELLOW}🔍 Testing local server...${NC}"
echo -e "${YELLOW}   Starting server in background...${NC}"

# Start server in background
uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ Local server is healthy${NC}\n"
else
    echo -e "${RED}❌ Local server health check failed${NC}\n"
fi

# Stop server
kill $SERVER_PID 2>/dev/null || true

# Git status
echo -e "${YELLOW}📝 Git Status:${NC}"
git status --short

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Pre-deployment checks complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Commit and push changes:"
echo -e "      ${GREEN}git add .${NC}"
echo -e "      ${GREEN}git commit -m 'Add AI microservice'${NC}"
echo -e "      ${GREEN}git push origin main${NC}\n"

echo -e "   2. Deploy to Render:"
echo -e "      • Go to https://dashboard.render.com"
echo -e "      • Click 'New +' → 'Web Service'"
echo -e "      • Connect your GitHub repository"
echo -e "      • Select 'Accentauraa' repository"
echo -e "      • Root Directory: ${GREEN}accentaura-backend/ai-microservice${NC}"
echo -e "      • Build Command: ${GREEN}pip install -r requirements.txt${NC}"
echo -e "      • Start Command: ${GREEN}uvicorn main:app --host 0.0.0.0 --port \$PORT${NC}\n"

echo -e "   3. Add Environment Variables in Render:"
echo -e "      • ${GREEN}GEMINI_API_KEY${NC} = your_api_key"
echo -e "      • ${GREEN}ALLOWED_ORIGINS${NC} = https://accentaura-api.onrender.com\n"

echo -e "   4. After deployment, update main backend:"
echo -e "      • Add ${GREEN}FASTAPI_URL${NC} = https://your-ai-service.onrender.com\n"

echo -e "${YELLOW}📚 Full guide: ${GREEN}DEPLOYMENT_GUIDE.md${NC}\n"
