#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Accentaura Test Database Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
DB_NAME="accentaura_test"
DB_USER="test"
DB_PASSWORD="test"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo -e "${RED}Error: PostgreSQL is not running on $DB_HOST:$DB_PORT${NC}"
    echo "Please start PostgreSQL first:"
    echo "  - macOS: brew services start postgresql"
    echo "  - Linux: sudo systemctl start postgresql"
    echo "  - Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# Drop existing test database if it exists
echo -e "${YELLOW}Dropping existing test database (if exists)...${NC}"
dropdb -h $DB_HOST -p $DB_PORT --if-exists $DB_NAME 2>/dev/null
echo -e "${GREEN}✓ Cleaned up existing database${NC}"
echo ""

# Drop existing test user if it exists
echo -e "${YELLOW}Dropping existing test user (if exists)...${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -d postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null
echo -e "${GREEN}✓ Cleaned up existing user${NC}"
echo ""

# Create test user
echo -e "${YELLOW}Creating test user '$DB_USER'...${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test user created${NC}"
else
    echo -e "${RED}Error: Failed to create test user${NC}"
    exit 1
fi
echo ""

# Create test database
echo -e "${YELLOW}Creating test database '$DB_NAME'...${NC}"
createdb -h $DB_HOST -p $DB_PORT -U postgres $DB_NAME 2>/dev/null || \
createdb -h $DB_HOST -p $DB_PORT $DB_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test database created${NC}"
else
    echo -e "${RED}Error: Failed to create test database${NC}"
    exit 1
fi
echo ""

# Grant privileges to test user
echo -e "${YELLOW}Granting privileges to test user...${NC}"

# Grant database privileges
psql -h $DB_HOST -p $DB_PORT -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Grant schema privileges
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Grant table privileges
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"

# Grant sequence privileges
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"

# Grant default privileges for future tables
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"

# Grant default privileges for future sequences
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

echo -e "${GREEN}✓ Privileges granted${NC}"
echo ""

# Run Prisma migrations
echo -e "${YELLOW}Running Prisma migrations...${NC}"
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}Error: Failed to run migrations${NC}"
    exit 1
fi
echo ""

# Grant privileges again after migrations (for newly created tables)
echo -e "${YELLOW}Granting privileges on migrated tables...${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"

psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || \
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"

echo -e "${GREEN}✓ Post-migration privileges granted${NC}"
echo ""

# Verify connection
echo -e "${YELLOW}Verifying test database connection...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Connection verified${NC}"
else
    echo -e "${RED}Error: Failed to connect with test user${NC}"
    exit 1
fi
echo ""

# Check MongoDB
echo -e "${YELLOW}Checking MongoDB connection...${NC}"
if mongosh --eval "db.version()" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
elif mongo --eval "db.version()" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB is not running (optional for some tests)${NC}"
    echo "To start MongoDB:"
    echo "  - macOS: brew services start mongodb-community"
    echo "  - Linux: sudo systemctl start mongod"
    echo "  - Docker: docker run -d -p 27017:27017 mongo:6"
fi
echo ""

# Check Redis
echo -e "${YELLOW}Checking Redis connection...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis is not running (optional for some tests)${NC}"
    echo "To start Redis:"
    echo "  - macOS: brew services start redis"
    echo "  - Linux: sudo systemctl start redis"
    echo "  - Docker: docker run -d -p 6379:6379 redis:7"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Test database configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""
echo "Connection string:"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "You can now run the integration tests:"
echo "  npm test tests/integration"
echo ""
