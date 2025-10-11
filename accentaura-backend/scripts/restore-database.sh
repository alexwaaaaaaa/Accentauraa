#!/bin/bash

# Database Restore Script for Accentaura Backend
# This script restores PostgreSQL and MongoDB databases from backup

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Accentaura Database Restore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified!${NC}"
    echo ""
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "  No backups found in backups/ directory"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Backup file: $BACKUP_FILE${NC}"
echo ""

# Extract backup
TEMP_DIR="temp_restore_$(date +%s)"
mkdir -p "$TEMP_DIR"

echo -e "${YELLOW}📂 Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup extracted!${NC}"
else
    echo -e "${RED}❌ Extraction failed!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi
echo ""

# Find the backup directory
BACKUP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Error: Could not find backup directory!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Display backup info
if [ -f "$BACKUP_DIR/backup_info.txt" ]; then
    echo -e "${YELLOW}📋 Backup Information:${NC}"
    cat "$BACKUP_DIR/backup_info.txt"
    echo ""
fi

# Confirm restore
echo -e "${RED}⚠️  WARNING: This will OVERWRITE your current database!${NC}"
echo ""
read -p "Are you sure you want to restore? (type 'RESTORE' to confirm): " -r
echo ""

if [[ ! $REPLY == "RESTORE" ]]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    rm -rf "$TEMP_DIR"
    exit 0
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Extract connection details from DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/([^:]+):.*/\1/')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^:]+:([^@]+)@.*/\1/')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^@]+@([^:]+):.*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^@]+@[^:]+:([^\/]+)\/.*/\1/')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^\/]+\/(.*)/\1/')

# Restore PostgreSQL
if [ -f "$BACKUP_DIR/postgresql_backup.dump" ]; then
    echo -e "${YELLOW}💾 Restoring PostgreSQL database...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop existing database and recreate (optional, comment out if you want to keep existing data)
    echo -e "${YELLOW}  Dropping existing database...${NC}"
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME" 2>/dev/null || true
    
    echo -e "${YELLOW}  Creating fresh database...${NC}"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    echo -e "${YELLOW}  Restoring data...${NC}"
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -v "$BACKUP_DIR/postgresql_backup.dump" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL restore completed!${NC}"
    else
        echo -e "${RED}❌ PostgreSQL restore failed!${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  No PostgreSQL backup found, skipping...${NC}"
    echo ""
fi

# Restore MongoDB
if [ -d "$BACKUP_DIR/mongodb_backup" ] && [ ! -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}💾 Restoring MongoDB database...${NC}"
    
    mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_DIR/mongodb_backup" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ MongoDB restore completed!${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB restore failed (may not be critical)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  No MongoDB backup found or MONGODB_URI not set, skipping...${NC}"
    echo ""
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Database Restore Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify database integrity"
echo "  2. Run migrations if needed: npm run migrate:deploy"
echo "  3. Restart application servers"
echo "  4. Test application functionality"
echo ""
