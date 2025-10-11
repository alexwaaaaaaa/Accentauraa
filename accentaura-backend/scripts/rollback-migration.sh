#!/bin/bash

# Migration Rollback Script for Accentaura Backend
# This script helps rollback the last migration in case of issues
# WARNING: Use with extreme caution in production!

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Accentaura Migration Rollback${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set!${NC}"
    exit 1
fi

# Mask password in DATABASE_URL for display
MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^:@]+)@/:****@/')
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  DATABASE_URL: $MASKED_URL"
echo ""

# Show current migration status
echo -e "${YELLOW}📊 Current migration status:${NC}"
npx prisma migrate status
echo ""

# Get the last migration
LAST_MIGRATION=$(ls -t prisma/migrations | head -n 1)

if [ -z "$LAST_MIGRATION" ]; then
    echo -e "${RED}❌ No migrations found to rollback!${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: You are about to rollback the last migration!${NC}"
echo ""
echo "Last migration: $LAST_MIGRATION"
echo ""
echo -e "${RED}This operation is DESTRUCTIVE and may result in data loss!${NC}"
echo ""
read -p "Are you absolutely sure you want to rollback? (type 'ROLLBACK' to confirm): " -r
echo ""

if [[ ! $REPLY == "ROLLBACK" ]]; then
    echo -e "${YELLOW}Rollback cancelled.${NC}"
    exit 0
fi

echo -e "${YELLOW}🔄 Rolling back migration...${NC}"
echo ""

# Note: Prisma doesn't have a built-in rollback command
# We need to manually handle this
echo -e "${YELLOW}Manual rollback steps:${NC}"
echo ""
echo "1. Create a backup of your database first!"
echo "2. Review the migration file: prisma/migrations/$LAST_MIGRATION/migration.sql"
echo "3. Create a reverse migration SQL script"
echo "4. Apply the reverse migration manually"
echo ""
echo "Example commands:"
echo "  # Backup database"
echo "  pg_dump -h host -U user -d database > backup.sql"
echo ""
echo "  # Apply reverse migration"
echo "  psql -h host -U user -d database < reverse_migration.sql"
echo ""
echo "  # Mark migration as rolled back in Prisma"
echo "  npx prisma migrate resolve --rolled-back $LAST_MIGRATION"
echo ""
echo -e "${YELLOW}For development environments, you can also:${NC}"
echo "  1. Reset the database: npx prisma migrate reset"
echo "  2. This will drop all data and reapply all migrations"
echo ""
