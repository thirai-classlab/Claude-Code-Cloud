#!/bin/bash
# Restart all development servers
# Usage: ./scripts/dev-restart.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Restarting development servers..."
echo ""

# Stop without prompting for Redis
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "code-server.*8080" 2>/dev/null || true

sleep 2

# Start
exec "$SCRIPT_DIR/dev-start.sh"
