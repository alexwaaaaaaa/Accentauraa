#!/bin/bash

# Combined Seed Script for Accentaura Backend
# This script runs all seed scripts in the correct order

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Accentaura Database Seeding${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set!${NC}"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

# Mask password in DATABASE_URL for display
MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^:@]+)@/:****@/')
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  DATABASE_URL: $MASKED_URL"
echo ""

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    exit 1
fi
echo ""

# Confirm seeding
echo -e "${YELLOW}⚠️  This will seed the database with initial data.${NC}"
echo "This includes:"
echo "  - 100 lesson levels with activities"
echo "  - 40+ achievement badges"
echo ""
read -p "Continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Seeding cancelled.${NC}"
    exit 0
fi

# Seed lessons
echo -e "${YELLOW}🌱 Seeding lessons (100 levels)...${NC}"
echo ""
npm run seed:lessons

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Lessons seeded successfully!${NC}"
else
    echo -e "${RED}❌ Lesson seeding failed!${NC}"
    exit 1
fi
echo ""

# Seed badges
echo -e "${YELLOW}🏆 Seeding badges...${NC}"
echo ""
npm run seed:badges

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Badges seeded successfully!${NC}"
else
    echo -e "${RED}❌ Badge seeding failed!${NC}"
    exit 1
fi
echo ""

# Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Database Seeding Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Query and display statistics
echo -e "${YELLOW}📊 Database Statistics:${NC}"
echo ""

# Count lessons
LESSON_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Lesson\";" 2>/dev/null | grep -oE '[0-9]+' | tail -1)
echo "  Lessons: $LESSON_COUNT"

# Count badges
BADGE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Badge\";" 2>/dev/null | grep -oE '[0-9]+' | tail -1)
echo "  Badges: $BADGE_COUNT"

# Count users
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -oE '[0-9]+' | tail -1)
echo "  Users: $USER_COUNT"

echo ""
echo "Database is ready for use!"
echo ""
