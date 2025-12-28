#!/bin/bash
# Stop all development servers
# Usage: ./scripts/dev-stop.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping development servers...${NC}"

# Stop Backend
if pkill -f "uvicorn app.main:app" 2>/dev/null; then
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}  Backend was not running${NC}"
fi

# Stop Frontend
if pkill -f "next dev" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}  Frontend was not running${NC}"
fi

# Stop code-server
if pkill -f "code-server.*8080" 2>/dev/null; then
    echo -e "${GREEN}✓ code-server stopped${NC}"
else
    echo -e "${YELLOW}  code-server was not running${NC}"
fi

# Optionally stop Redis
read -p "Stop Redis? (y/N): " stop_redis
if [[ "$stop_redis" =~ ^[Yy]$ ]]; then
    if redis-cli shutdown 2>/dev/null; then
        echo -e "${GREEN}✓ Redis stopped${NC}"
    else
        echo -e "${YELLOW}  Redis was not running${NC}"
    fi
fi

echo ""
echo -e "${GREEN}All services stopped.${NC}"
