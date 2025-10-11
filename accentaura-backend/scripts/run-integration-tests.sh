#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Running Integration Tests${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if test database exists
echo -e "${YELLOW}Checking test database...${NC}"
if ! psql -h localhost -p 5432 -U test -d accentaura_test -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Test database not found!${NC}"
    echo "Please run: ./scripts/setup-test-database.sh"
    exit 1
fi
echo -e "${GREEN}✓ Test database ready${NC}"
echo ""

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/accentaura_test"
export MONGODB_URI="mongodb://localhost:27017/accentaura_test"
export REDIS_URL="redis://localhost:6379/1"
export JWT_SECRET="test-jwt-secret-key-for-testing-only"
export JWT_REFRESH_SECRET="test-jwt-refresh-secret-key-for-testing-only"
export GEMINI_API_KEY="test-gemini-api-key"
export FASTAPI_URL="http://localhost:8000"
export GOOGLE_CLIENT_ID="test-google-client-id"
export FACEBOOK_APP_ID="test-facebook-app-id"
export SENTRY_DSN=""
export DD_TRACE_ENABLED="false"

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
echo ""

if [ -z "$1" ]; then
    # Run all integration tests
    npm test -- tests/integration --forceExit --detectOpenHandles
else
    # Run specific test file
    npm test -- "$1" --forceExit --detectOpenHandles
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some tests failed${NC}"
    echo -e "${RED}========================================${NC}"
fi

exit $TEST_EXIT_CODE
