#!/bin/bash
# Check status of all development servers
# Usage: ./scripts/dev-status.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Development Server Status           ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Redis
echo -n "Redis (6379):      "
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}Running${NC}"
else
    echo -e "${RED}Stopped${NC}"
fi

# Check Backend
echo -n "Backend (8000):    "
if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}Running${NC}"
    # Get health details
    health=$(curl -s http://localhost:8000/api/health 2>/dev/null)
    if [ -n "$health" ]; then
        echo "                   $health"
    fi
else
    echo -e "${RED}Stopped${NC}"
fi

# Check Frontend
echo -n "Frontend (3000):   "
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}Running${NC}"
else
    echo -e "${RED}Stopped${NC}"
fi

# Check code-server
echo -n "code-server (8080):"
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN} Running${NC}"
else
    echo -e "${RED} Stopped${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo "Process IDs:"
echo -e "${BLUE}========================================${NC}"

# Show PIDs
BACKEND_PID=$(pgrep -f "uvicorn app.main:app" 2>/dev/null | head -1)
FRONTEND_PID=$(pgrep -f "next dev" 2>/dev/null | head -1)
CODESERVER_PID=$(pgrep -f "code-server.*8080" 2>/dev/null | head -1)

[ -n "$BACKEND_PID" ] && echo "Backend:     $BACKEND_PID" || echo "Backend:     -"
[ -n "$FRONTEND_PID" ] && echo "Frontend:    $FRONTEND_PID" || echo "Frontend:    -"
[ -n "$CODESERVER_PID" ] && echo "code-server: $CODESERVER_PID" || echo "code-server: -"

echo ""
