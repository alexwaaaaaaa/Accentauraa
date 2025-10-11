#!/bin/bash

# Database Setup Script for Accentaura Backend
# This script helps set up PostgreSQL database and run migrations

echo "🚀 Accentaura Backend - Database Setup"
echo "======================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your database credentials."
    exit 1
fi

# Load environment variables
source .env

echo "📋 Configuration:"
echo "  DATABASE_URL: ${DATABASE_URL}"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    echo ""
    echo "Please ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database credentials in .env are correct"
    echo "  3. Database 'accentaura' exists"
    echo ""
    echo "To create the database, run:"
    echo "  psql -U postgres -c 'CREATE DATABASE accentaura;'"
    exit 1
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client generated successfully!"
else
    echo "❌ Prisma Client generation failed!"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run seed' to populate initial data (when seed script is ready)"
echo "  2. Run 'npm run dev' to start the development server"
