.PHONY: help build up down restart logs clean migrate seed test

# Default target
help:
	@echo "Accentaura Backend - Docker Compose Commands"
	@echo ""
	@echo "Production Commands:"
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services in production mode"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-api       - View API logs"
	@echo "  make logs-ai        - View AI microservice logs"
	@echo "  make migrate        - Run database migrations"
	@echo "  make seed           - Seed database with initial data"
	@echo "  make clean          - Stop services and remove volumes (WARNING: deletes data)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev            - Start all services in development mode"
	@echo "  make dev-down       - Stop development services"
	@echo "  make dev-logs       - View development logs"
	@echo "  make dev-migrate    - Run migrations in development"
	@echo "  make dev-seed       - Seed development database"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make ps             - List running containers"
	@echo "  make health         - Check service health"
	@echo "  make shell-api      - Open shell in API container"
	@echo "  make shell-ai       - Open shell in AI container"
	@echo "  make db-psql        - Connect to PostgreSQL"
	@echo "  make db-mongo       - Connect to MongoDB"
	@echo "  make db-redis       - Connect to Redis"
	@echo "  make test           - Run tests"
	@echo "  make backup         - Backup databases"

# Production commands
build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 10
	@make health

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f api

logs-ai:
	docker-compose logs -f ai-microservice

migrate:
	docker-compose exec api npx prisma migrate deploy

seed:
	docker-compose exec api npm run seed

clean:
	@echo "WARNING: This will delete all data. Press Ctrl+C to cancel."
	@sleep 5
	docker-compose down -v

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-migrate:
	docker-compose -f docker-compose.dev.yml exec api npx prisma migrate dev

dev-seed:
	docker-compose -f docker-compose.dev.yml exec api npm run seed

# Utility commands
ps:
	docker-compose ps

health:
	@echo "Checking API health..."
	@curl -f http://localhost:3000/health || echo "API is not healthy"
	@echo ""
	@echo "Checking AI service health..."
	@curl -f http://localhost:8000/health || echo "AI service is not healthy"

shell-api:
	docker-compose exec api sh

shell-ai:
	docker-compose exec ai-microservice sh

db-psql:
	docker-compose exec postgres psql -U accentaura -d accentaura

db-mongo:
	docker-compose exec mongodb mongosh -u accentaura -p accentaura_password

db-redis:
	docker-compose exec redis redis-cli

test:
	docker-compose exec api npm test

backup:
	@echo "Backing up PostgreSQL..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U accentaura accentaura > backups/postgres-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "Backing up MongoDB..."
	@docker-compose exec mongodb mongodump --username accentaura --password accentaura_password --out /tmp/backup
	@docker-compose cp mongodb:/tmp/backup backups/mongodb-$(shell date +%Y%m%d-%H%M%S)
	@echo "Backups completed in ./backups directory"

# Quick setup for first time
setup: build up migrate seed
	@echo "Setup complete! Services are running."
	@make health

# Development setup
dev-setup:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for services..."
	@sleep 10
	@make dev-migrate
	@make dev-seed
	@echo "Development setup complete!"
