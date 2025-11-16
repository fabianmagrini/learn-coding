.PHONY: help install dev build test docker-up docker-down clean demo token

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	npm install

dev: ## Start AQS service in development mode
	npm run dev:aqs

build: ## Build all services
	npm run build

test: ## Run all tests
	npm run test:unit

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-rebuild: ## Rebuild and restart Docker services
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

clean: ## Clean build artifacts and node_modules
	rm -rf node_modules
	rm -rf */node_modules
	rm -rf */*/node_modules
	rm -rf */dist
	rm -rf */*/dist

token: ## Generate demo JWT tokens
	node scripts/generate-token.js

demo: ## Run demo script
	bash scripts/demo.sh

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://localhost:8080/healthz | jq '.' || echo "AQS service not responding"
	@curl -s http://localhost:8080/v1/admin/health | jq '.' || echo "Health check failed"

metrics: ## Show current metrics
	@curl -s http://localhost:8080/metrics
