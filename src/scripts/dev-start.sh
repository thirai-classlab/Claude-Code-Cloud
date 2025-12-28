#!/bin/bash
# Start all development servers
# Usage: ./scripts/dev-start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Claude Code - Development Servers   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required variables"
    exit 1
fi

# Stop any existing processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "code-server.*8080" 2>/dev/null || true
sleep 2

# Create log directory
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Start Redis (if not running)
echo -e "${YELLOW}Checking Redis...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    redis-server --daemonize yes
    sleep 1
fi
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis: Running on port 6379${NC}"
else
    echo -e "${RED}✗ Redis: Failed to start${NC}"
    exit 1
fi

# Start Backend
echo -e "${YELLOW}Starting Backend...${NC}"
cd "$PROJECT_ROOT/src/backend"
source .venv/bin/activate 2>/dev/null || true
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Start Frontend
echo -e "${YELLOW}Starting Frontend...${NC}"
cd "$PROJECT_ROOT/src/frontend"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Start code-server
echo -e "${YELLOW}Starting code-server...${NC}"
nohup code-server --port 8080 --auth none --bind-addr 0.0.0.0:8080 "$PROJECT_ROOT/workspace" > "$LOG_DIR/code-server.log" 2>&1 &
CODESERVER_PID=$!
echo "code-server PID: $CODESERVER_PID"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 3

# Check Backend
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend: http://localhost:8000${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend: Failed to start (check logs/backend.log)${NC}"
    fi
    sleep 1
done

# Check Frontend
for i in {1..30}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend: http://localhost:3000${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Frontend: Failed to start (check logs/frontend.log)${NC}"
    fi
    sleep 1
done

# Check code-server
for i in {1..10}; do
    if curl -sf http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ code-server: http://localhost:8080${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ code-server: Failed to start (check logs/code-server.log)${NC}"
    fi
    sleep 1
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All services started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Service URLs:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  code-server: http://localhost:8080"
echo ""
echo "Log files:"
echo "  Backend:     $LOG_DIR/backend.log"
echo "  Frontend:    $LOG_DIR/frontend.log"
echo "  code-server: $LOG_DIR/code-server.log"
echo ""
echo "To stop all services: ./scripts/dev-stop.sh"
echo "To view logs: tail -f $LOG_DIR/*.log"
