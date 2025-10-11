# Prisma Database Configuration

This directory contains the Prisma schema and migrations for the Accentaura Backend.

## Database Schema

The database includes the following models:

- **User**: User accounts with authentication and progress tracking
- **Lesson**: Learning content with 100 levels
- **Progress**: User progress on individual lessons
- **Badge**: Achievement badges
- **UserBadge**: Badges earned by users
- **RefreshToken**: JWT refresh tokens for authentication

## Setup Instructions

### Prerequisites

1. **PostgreSQL 15+** installed and running
2. **Node.js 20+** installed
3. Environment variables configured in `.env`

### Initial Setup

1. **Create the database:**
   ```bash
   # Using psql
   psql -U postgres -c 'CREATE DATABASE accentaura;'
   
   # Or using createdb
   createdb accentaura
   ```

2. **Configure DATABASE_URL in .env:**
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/accentaura?schema=public
   ```

3. **Run migrations:**
   ```bash
   # From the project root
   npx prisma migrate deploy
   
   # Or use the setup script
   ./scripts/setup-database.sh
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## Development Commands

### Create a new migration
```bash
npx prisma migrate dev --name migration_name
```

### Apply migrations
```bash
npx prisma migrate deploy
```

### Reset database (WARNING: deletes all data)
```bash
npx prisma migrate reset
```

### Open Prisma Studio (database GUI)
```bash
npx prisma studio
```

### Generate Prisma Client
```bash
npx prisma generate
```

### Validate schema
```bash
npx prisma validate
```

### Format schema
```bash
npx prisma format
```

## Connection Pooling

The database connection is configured with connection pooling in `src/config/db.ts`:

- Automatic connection management
- Query logging in development mode
- Error and warning logging
- Graceful shutdown support

## Indexes

The schema includes indexes on frequently queried fields:

- `User.email` - Fast login lookups
- `User.totalXp` - Leaderboard queries
- `Progress.userId` - User progress retrieval
- `Progress.lessonId` - Lesson completion stats
- `Lesson.level` - Sequential lesson access
- `RefreshToken.token` - Token validation

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check credentials in `.env`

3. Ensure database exists:
   ```bash
   psql -U postgres -l | grep accentaura
   ```

### Migration Issues

If migrations fail:

1. Check migration status:
   ```bash
   npx prisma migrate status
   ```

2. Resolve conflicts manually if needed

3. Reset and reapply (development only):
   ```bash
   npx prisma migrate reset
   ```

### Client Generation Issues

If Prisma Client is not found:

```bash
npx prisma generate
```

## Production Deployment

For production:

1. Use connection pooling (e.g., PgBouncer)
2. Set appropriate connection limits
3. Use `prisma migrate deploy` (not `migrate dev`)
4. Enable SSL in DATABASE_URL:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&sslmode=require
   ```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
