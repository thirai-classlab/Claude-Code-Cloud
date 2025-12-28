#!/bin/bash
# Start Claude Code services

set -e

echo "Starting Claude Code services..."

# Environment variable check
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Using .env.example as template."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Please edit .env file and set required variables (ANTHROPIC_API_KEY, SECRET_KEY)"
        exit 1
    fi
fi

# Check for required environment variables
if ! grep -q "ANTHROPIC_API_KEY=sk-ant-" .env 2>/dev/null; then
    echo "Error: ANTHROPIC_API_KEY not set in .env file"
    exit 1
fi

# Start services with Docker Compose
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
timeout 60 bash -c '
while true; do
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done
'

echo ""
echo "✓ All services are up and healthy!"
echo ""
echo "Service URLs:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  code-server: http://localhost:8080"
echo ""
docker-compose ps
