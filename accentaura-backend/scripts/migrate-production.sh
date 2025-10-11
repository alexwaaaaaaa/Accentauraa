#!/bin/bash

# Production Migration Script for Accentaura Backend
# This script runs Prisma migrations in production environment
# Use with caution - always backup database before running!

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Accentaura Production Migration${NC}"
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

# Confirm production deployment
echo -e "${YELLOW}⚠️  WARNING: You are about to run migrations in PRODUCTION!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Migration cancelled.${NC}"
    exit 0
fi

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. PostgreSQL is accessible"
    echo "  2. DATABASE_URL is correct"
    echo "  3. Network/firewall allows connection"
    exit 1
fi
echo ""

# Check migration status
echo -e "${YELLOW}📊 Checking current migration status...${NC}"
npx prisma migrate status
echo ""

# Run migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo "Please check the error messages above and:"
    echo "  1. Verify database permissions"
    echo "  2. Check for conflicting schema changes"
    echo "  3. Review migration files in prisma/migrations/"
    exit 1
fi
echo ""

# Generate Prisma Client
echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
npx prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma Client generated successfully!${NC}"
else
    echo -e "${RED}❌ Prisma Client generation failed!${NC}"
    exit 1
fi
echo ""

# Verify migration
echo -e "${YELLOW}✓ Verifying migration status...${NC}"
npx prisma migrate status
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Production Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run seed scripts if needed: npm run seed:all"
echo "  2. Restart application servers"
echo "  3. Monitor application logs for errors"
echo "  4. Verify application functionality"
echo ""
