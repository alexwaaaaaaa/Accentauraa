#!/bin/bash

# Database Backup Script for Accentaura Backend
# This script creates backups of PostgreSQL and MongoDB databases

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Accentaura Database Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup directory
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$BACKUP_PATH"

echo -e "${YELLOW}📁 Backup directory: $BACKUP_PATH${NC}"
echo ""

# Parse DATABASE_URL for PostgreSQL backup
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set!${NC}"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/([^:]+):.*/\1/')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^:]+:([^@]+)@.*/\1/')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^@]+@([^:]+):.*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^@]+@[^:]+:([^\/]+)\/.*/\1/')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^\/]+\/(.*)/\1/')

# Backup PostgreSQL
echo -e "${YELLOW}💾 Backing up PostgreSQL database...${NC}"
export PGPASSWORD="$DB_PASSWORD"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -F c -b -v -f "$BACKUP_PATH/postgresql_backup.dump" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL backup completed!${NC}"
    PG_SIZE=$(du -h "$BACKUP_PATH/postgresql_backup.dump" | cut -f1)
    echo "   Size: $PG_SIZE"
else
    echo -e "${RED}❌ PostgreSQL backup failed!${NC}"
    exit 1
fi
echo ""

# Backup MongoDB (if MONGODB_URI is set)
if [ ! -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}💾 Backing up MongoDB database...${NC}"
    
    # Extract database name from MongoDB URI
    MONGO_DB=$(echo "$MONGODB_URI" | sed -E 's/.*\/([^?]+).*/\1/')
    
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH/mongodb_backup" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ MongoDB backup completed!${NC}"
        MONGO_SIZE=$(du -sh "$BACKUP_PATH/mongodb_backup" | cut -f1)
        echo "   Size: $MONGO_SIZE"
    else
        echo -e "${YELLOW}⚠️  MongoDB backup failed (may not be critical)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  MONGODB_URI not set, skipping MongoDB backup${NC}"
    echo ""
fi

# Create backup metadata
echo -e "${YELLOW}📝 Creating backup metadata...${NC}"
cat > "$BACKUP_PATH/backup_info.txt" << EOF
Accentaura Database Backup
==========================

Timestamp: $(date)
Backup ID: $TIMESTAMP

PostgreSQL:
  Host: $DB_HOST
  Port: $DB_PORT
  Database: $DB_NAME
  User: $DB_USER
  Backup File: postgresql_backup.dump

MongoDB:
  URI: ${MONGODB_URI:-"Not configured"}
  Backup Directory: mongodb_backup/

Restore Instructions:
  PostgreSQL: pg_restore -h host -p port -U user -d database postgresql_backup.dump
  MongoDB: mongorestore --uri="mongodb://..." mongodb_backup/

EOF

echo -e "${GREEN}✅ Metadata created!${NC}"
echo ""

# Compress backup
echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup compressed!${NC}"
    COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)
    echo "   Size: $COMPRESSED_SIZE"
    
    # Remove uncompressed backup
    rm -rf "$BACKUP_PATH"
else
    echo -e "${RED}❌ Compression failed!${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backup file: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
echo "Size: $COMPRESSED_SIZE"
echo ""
echo "To restore this backup:"
echo "  1. Extract: tar -xzf backup_$TIMESTAMP.tar.gz"
echo "  2. Follow instructions in backup_info.txt"
echo ""
