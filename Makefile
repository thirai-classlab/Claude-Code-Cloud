# Makefile for Claude Code Docker operations

.PHONY: help build up down restart logs clean test

help:
	@echo "Claude Code - Docker Operations"
	@echo "================================"
	@echo "make build       - Build all Docker images"
	@echo "make up          - Start all services"
	@echo "make down        - Stop all services"
	@echo "make restart     - Restart all services"
	@echo "make logs        - View logs"
	@echo "make clean       - Clean up resources"
	@echo "make test        - Run tests"
	@echo ""
	@echo "Development commands:"
	@echo "make dev         - Start in development mode"
	@echo "make logs-backend   - View backend logs"
	@echo "make logs-frontend  - View frontend logs"
	@echo "make shell-backend  - Open backend shell"
	@echo "make shell-frontend - Open frontend shell"
	@echo ""
	@echo "Docker-in-Docker commands:"
	@echo "make dind-up           - Start DinD services"
	@echo "make up-with-dind      - Start all services with DinD"
	@echo "make dind-down         - Stop DinD services"
	@echo "make dind-logs         - Show DinD logs"
	@echo "make dind-clean        - Clean DinD storage"
	@echo "make dind-test         - Test DinD connectivity"
	@echo "make dind-stats        - Show DinD statistics"

build:
	docker-compose build --parallel

up:
	docker-compose up -d
	@echo "Waiting for services..."
	@sleep 5
	@make status

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "Development mode started"
	@make logs

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

status:
	@docker-compose ps
	@echo ""
	@curl -s http://localhost:8000/api/health 2>/dev/null || echo "Backend not ready yet"

clean:
	docker-compose down -v --rmi local
	docker image prune -f

test:
	docker-compose run --rm backend poetry run pytest

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

redis-cli:
	docker-compose exec redis redis-cli

# ============================================
# Docker-in-Docker Commands
# ============================================

.PHONY: dind-up dind-down dind-logs dind-clean dind-test dind-backup dind-restore dind-stats

# Start DinD services
dind-up:
	@echo "Starting DinD services..."
	@if [ ! -d "./dind-storage" ]; then mkdir -p ./dind-storage; fi
	docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d dind
	@echo "Waiting for DinD to be healthy..."
	@sleep 15
	@docker-compose exec dind docker info || echo "DinD not ready yet, please wait..."

# Stop DinD services
dind-down:
	@echo "Stopping DinD services..."
	docker-compose -f docker-compose.yml -f docker-compose.dind.yml stop dind
	@echo "DinD stopped"

# Start all services including DinD
up-with-dind:
	@echo "Starting all services with DinD..."
	@if [ ! -d "./dind-storage" ]; then mkdir -p ./dind-storage; fi
	docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d
	@echo "All services started!"

# View DinD logs
dind-logs:
	docker-compose -f docker-compose.yml -f docker-compose.dind.yml logs -f dind

# Clean DinD storage
dind-clean:
	@echo "Cleaning DinD storage..."
	@docker-compose -f docker-compose.yml -f docker-compose.dind.yml exec dind docker system prune -af --volumes || echo "DinD not running"
	@echo "Done!"

# Test DinD connectivity
dind-test:
	@echo "Testing DinD connectivity..."
	@echo "\n1. Testing DinD daemon:"
	@docker-compose -f docker-compose.yml -f docker-compose.dind.yml exec dind docker info || echo "FAIL: DinD daemon not responding"
	@echo "\n2. Testing from code-server:"
	@docker-compose -f docker-compose.yml -f docker-compose.dind.yml exec code-server docker info || echo "FAIL: code-server cannot connect to DinD"
	@echo "\nAll tests completed!"

# Backup DinD storage
dind-backup:
	@mkdir -p ./backups
	@echo "Backing up DinD storage..."
	@BACKUP_FILE=dind-backup-$$(date +%Y%m%d-%H%M%S).tar.gz; \
	docker run --rm \
		-v claude-dind-storage:/data:ro \
		-v $$(pwd)/backups:/backup \
		alpine tar czf /backup/$$BACKUP_FILE -C /data . && \
	echo "Backup saved to: ./backups/$$BACKUP_FILE"

# Show DinD status and statistics
dind-stats:
	@echo "DinD Statistics:"
	@echo "==============="
	@echo "\nContainers in DinD:"
	@docker-compose -f docker-compose.yml -f docker-compose.dind.yml exec dind docker ps -a || echo "DinD not running"
	@echo "\nImages in DinD:"
	@docker-compose -f docker-compose.yml -f docker-compose.dind.yml exec dind docker images || echo "DinD not running"
	@echo "\nResource usage:"
	@docker stats claude-dind --no-stream || echo "DinD not running"
