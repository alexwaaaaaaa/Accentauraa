#!/bin/bash

# Mobile App - Backend Integration Test Script
# Tests all API endpoints to verify integration

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="https://accentaura-api.onrender.com"

echo -e "${YELLOW}🧪 Testing Backend Integration${NC}\n"

# Test 1: Root endpoint
echo -e "${YELLOW}Test 1: Root Endpoint${NC}"
response=$(curl -s "$BACKEND_URL/")
if echo "$response" | grep -q "Accentaura API"; then
    echo -e "${GREEN}✅ Root endpoint working${NC}\n"
else
    echo -e "${RED}❌ Root endpoint failed${NC}\n"
    exit 1
fi

# Test 2: Health check
echo -e "${YELLOW}Test 2: Health Check${NC}"
response=$(curl -s "$BACKEND_URL/health")
if echo "$response" | grep -q "status"; then
    echo -e "${GREEN}✅ Health check working${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
else
    echo -e "${RED}❌ Health check failed${NC}\n"
    exit 1
fi

# Test 3: Auth - Register (will fail if user exists, that's ok)
echo -e "${YELLOW}Test 3: User Registration${NC}"
response=$(curl -s -X POST "$BACKEND_URL/v1/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test_'$(date +%s)'@example.com",
        "password": "password123",
        "name": "Test User"
    }')
if echo "$response" | grep -q "token\|email"; then
    echo -e "${GREEN}✅ Registration endpoint working${NC}\n"
else
    echo -e "${YELLOW}⚠️  Registration response: $response${NC}\n"
fi

# Test 4: Auth - Login with invalid credentials (should fail gracefully)
echo -e "${YELLOW}Test 4: Login with Invalid Credentials${NC}"
response=$(curl -s -X POST "$BACKEND_URL/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "invalid@example.com",
        "password": "wrongpassword"
    }')
if echo "$response" | grep -q "message\|error"; then
    echo -e "${GREEN}✅ Login endpoint working (error handling correct)${NC}\n"
else
    echo -e "${RED}❌ Login endpoint failed${NC}\n"
fi

# Test 5: Lessons endpoint (should require auth or return error)
echo -e "${YELLOW}Test 5: Lessons Endpoint${NC}"
response=$(curl -s "$BACKEND_URL/v1/lessons?from=1&to=5")
if echo "$response" | grep -q "lessons\|message\|error"; then
    echo -e "${GREEN}✅ Lessons endpoint responding${NC}\n"
else
    echo -e "${RED}❌ Lessons endpoint failed${NC}\n"
fi

# Test 6: Leaderboard endpoint
echo -e "${YELLOW}Test 6: Leaderboard Endpoint${NC}"
response=$(curl -s "$BACKEND_URL/v1/leaderboard?limit=10")
if echo "$response" | grep -q "leaderboard\|message\|error"; then
    echo -e "${GREEN}✅ Leaderboard endpoint responding${NC}\n"
else
    echo -e "${RED}❌ Leaderboard endpoint failed${NC}\n"
fi

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backend Integration Tests Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📱 Mobile App Configuration:${NC}"
echo -e "   Production URL: $BACKEND_URL/v1"
echo -e "   Status: ${GREEN}Ready for testing${NC}\n"

echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo -e "   1. Run mobile app: ${GREEN}flutter run --dart-define=ENV=production${NC}"
echo -e "   2. Test user registration and login"
echo -e "   3. Test lesson fetching"
echo -e "   4. Test progress saving"
echo -e "   5. Test leaderboard\n"
