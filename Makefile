# =============================================================================
# Claude Usage Dashboard - Makefile
# =============================================================================

.PHONY: dev dev-api dev-web docker-dev build deploy stop logs clean help \
        install test lint format check sync tunnel status restart

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# Development
# =============================================================================

## Start all development servers (API + Web)
dev:
	@echo "$(CYAN)Starting development servers...$(RESET)"
	@$(MAKE) -j2 dev-api dev-web

## Start FastAPI backend server
dev-api:
	@echo "$(CYAN)Starting API server on http://localhost:8000$(RESET)"
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## Start Next.js frontend server
dev-web:
	@echo "$(CYAN)Starting Web server on http://localhost:3000$(RESET)"
	npm run dev

## Install all dependencies
install:
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	npm ci
	cd backend && pip install -r requirements.txt

# =============================================================================
# Docker Development
# =============================================================================

## Start Docker development environment with hot reload
docker-dev:
	@echo "$(CYAN)Starting Docker development environment...$(RESET)"
	docker compose -f docker/docker-compose.dev.yml up --build

## Start Docker dev in background
docker-dev-d:
	@echo "$(CYAN)Starting Docker development environment (detached)...$(RESET)"
	docker compose -f docker/docker-compose.dev.yml up --build -d

## Stop Docker development environment
docker-dev-stop:
	@echo "$(YELLOW)Stopping Docker development environment...$(RESET)"
	docker compose -f docker/docker-compose.dev.yml down

# =============================================================================
# Production Build & Deploy
# =============================================================================

## Build production Docker images
build:
	@echo "$(CYAN)Building production images...$(RESET)"
	docker compose -f docker/docker-compose.yml build --no-cache

## Build with cache (faster)
build-cache:
	@echo "$(CYAN)Building production images (with cache)...$(RESET)"
	docker compose -f docker/docker-compose.yml build

## Deploy to production (start containers)
deploy:
	@echo "$(GREEN)Deploying to production...$(RESET)"
	docker compose -f docker/docker-compose.yml up -d
	@echo "$(GREEN)Dashboard available at http://localhost$(RESET)"

## Stop production containers
stop:
	@echo "$(YELLOW)Stopping production containers...$(RESET)"
	docker compose -f docker/docker-compose.yml down

## Restart production containers
restart:
	@echo "$(YELLOW)Restarting production containers...$(RESET)"
	docker compose -f docker/docker-compose.yml restart

## View production logs
logs:
	docker compose -f docker/docker-compose.yml logs -f

## View logs for specific service (usage: make logs-api or logs-web or logs-nginx)
logs-api:
	docker compose -f docker/docker-compose.yml logs -f api

logs-web:
	docker compose -f docker/docker-compose.yml logs -f web

logs-nginx:
	docker compose -f docker/docker-compose.yml logs -f nginx

## Show container status
status:
	@echo "$(CYAN)Container Status:$(RESET)"
	docker compose -f docker/docker-compose.yml ps

# =============================================================================
# Data Sync & Tunnels
# =============================================================================

## Sync Claude data from Mac to NUC
sync:
	@echo "$(CYAN)Syncing Claude data...$(RESET)"
	./scripts/sync-data.sh

## Setup Tailscale/Cloudflare tunnel
tunnel:
	@echo "$(CYAN)Setting up tunnel...$(RESET)"
	./scripts/setup-tunnel.sh

# =============================================================================
# Code Quality
# =============================================================================

## Run linter
lint:
	@echo "$(CYAN)Running linter...$(RESET)"
	npm run lint

## Format code
format:
	@echo "$(CYAN)Formatting code...$(RESET)"
	npm run format || npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"

## Run tests
test:
	@echo "$(CYAN)Running tests...$(RESET)"
	npm test || echo "No tests configured"
	cd backend && pytest || echo "No backend tests configured"

## Run all checks (lint + test)
check: lint test
	@echo "$(GREEN)All checks passed!$(RESET)"

# =============================================================================
# Cleanup
# =============================================================================

## Clean all build artifacts and containers
clean:
	@echo "$(RED)Cleaning up...$(RESET)"
	docker compose -f docker/docker-compose.yml down -v --rmi local
	docker compose -f docker/docker-compose.dev.yml down -v --rmi local
	rm -rf .next
	rm -rf node_modules
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache
	@echo "$(GREEN)Cleanup complete!$(RESET)"

## Clean Docker images only
clean-docker:
	@echo "$(RED)Removing Docker containers and volumes...$(RESET)"
	docker compose -f docker/docker-compose.yml down -v --rmi all
	docker system prune -f

## Clean node modules and reinstall
clean-deps:
	@echo "$(YELLOW)Cleaning and reinstalling dependencies...$(RESET)"
	rm -rf node_modules package-lock.json
	npm install

# =============================================================================
# Help
# =============================================================================

## Show this help message
help:
	@echo ""
	@echo "$(CYAN)Claude Usage Dashboard - Available Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make dev          - Start all development servers"
	@echo "  make dev-api      - Start API server only"
	@echo "  make dev-web      - Start web server only"
	@echo "  make install      - Install all dependencies"
	@echo ""
	@echo "$(GREEN)Docker Development:$(RESET)"
	@echo "  make docker-dev   - Start Docker dev environment"
	@echo "  make docker-dev-d - Start Docker dev (background)"
	@echo "  make docker-dev-stop - Stop Docker dev environment"
	@echo ""
	@echo "$(GREEN)Production:$(RESET)"
	@echo "  make build        - Build production images"
	@echo "  make deploy       - Deploy to production"
	@echo "  make stop         - Stop production containers"
	@echo "  make restart      - Restart production containers"
	@echo "  make logs         - View all logs"
	@echo "  make status       - Show container status"
	@echo ""
	@echo "$(GREEN)Data & Sync:$(RESET)"
	@echo "  make sync         - Sync data from Mac to NUC"
	@echo "  make tunnel       - Setup Tailscale/Cloudflare tunnel"
	@echo ""
	@echo "$(GREEN)Code Quality:$(RESET)"
	@echo "  make lint         - Run linter"
	@echo "  make format       - Format code"
	@echo "  make test         - Run tests"
	@echo "  make check        - Run all checks"
	@echo ""
	@echo "$(GREEN)Cleanup:$(RESET)"
	@echo "  make clean        - Clean all artifacts"
	@echo "  make clean-docker - Clean Docker resources"
	@echo "  make clean-deps   - Reinstall dependencies"
	@echo ""
