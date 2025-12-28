#!/bin/bash
# Validate Docker setup for Claude Code

set -e

echo "==================================="
echo "Claude Code - Setup Validation"
echo "==================================="
echo ""

ERRORS=0

# Check Docker
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✓ Docker installed: $DOCKER_VERSION"
else
    echo "✗ Docker not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker Compose
echo "Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo "✓ Docker Compose installed: $COMPOSE_VERSION"
else
    echo "✗ Docker Compose not found"
    ERRORS=$((ERRORS + 1))
fi

# Check required files
echo ""
echo "Checking required files..."
REQUIRED_FILES=(
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "redis/redis.conf"
    ".env.example"
    "Makefile"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ $file not found"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check .env file
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"

    # Check for required variables
    if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env 2>/dev/null; then
        echo "✓ ANTHROPIC_API_KEY is set"
    else
        echo "⚠ ANTHROPIC_API_KEY not properly set in .env"
        echo "  Please set your Anthropic API key"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "SECRET_KEY=.*" .env 2>/dev/null; then
        SECRET_KEY=$(grep "SECRET_KEY=" .env | cut -d'=' -f2)
        if [ ${#SECRET_KEY} -ge 32 ]; then
            echo "✓ SECRET_KEY is set (length: ${#SECRET_KEY})"
        else
            echo "⚠ SECRET_KEY is too short (should be 32+ characters)"
            echo "  Generate one: openssl rand -hex 32"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo "✗ SECRET_KEY not set in .env"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠ .env file not found"
    echo "  Copy .env.example to .env and configure it"
    ERRORS=$((ERRORS + 1))
fi

# Check directory structure
echo ""
echo "Checking directory structure..."
REQUIRED_DIRS=(
    "backend/app"
    "frontend"
    "redis"
    "workspace"
    "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ $dir/"
    else
        echo "✗ $dir/ not found"
        ERRORS=$((ERRORS + 1))
    fi
done

# Summary
echo ""
echo "==================================="
if [ $ERRORS -eq 0 ]; then
    echo "✓ Setup validation passed!"
    echo "You can now run: make up"
else
    echo "✗ Found $ERRORS error(s)"
    echo "Please fix the issues above before starting"
    exit 1
fi
echo "==================================="
