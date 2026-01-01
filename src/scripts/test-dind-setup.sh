#!/bin/bash
# DinD環境のセットアップテストスクリプト

set -e

echo "================================================"
echo "DinD Environment Setup Test"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result counters
PASSED=0
FAILED=0

# Test function
test_step() {
    local description=$1
    local command=$2

    echo -n "Testing: $description... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test with output
test_step_output() {
    local description=$1
    local command=$2

    echo "Testing: $description"

    if eval "$command"; then
        echo -e "${GREEN}PASS${NC}"
        echo ""
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        echo ""
        ((FAILED++))
        return 1
    fi
}

echo "Step 1: Check Docker Compose files"
echo "-----------------------------------"
test_step "docker-compose.yml exists" "[ -f docker-compose.yml ]"
test_step "docker-compose.dind.yml exists" "[ -f docker-compose.dind.yml ]"
echo ""

echo "Step 2: Check DinD container"
echo "-----------------------------------"
test_step "DinD container is running" "docker ps | grep -q claude-dind"
test_step_output "DinD health check" "docker exec claude-dind docker info"

echo "Step 3: Check Backend container"
echo "-----------------------------------"
test_step "Backend container is running" "docker ps | grep -q claude-backend"
test_step "Backend has Docker CLI installed" "docker exec claude-backend which docker"
test_step "Backend can connect to DinD" "docker exec claude-backend docker info"
test_step_output "Backend environment variables" "docker exec claude-backend env | grep -E 'DOCKER_HOST|DIND_ENABLED|DIND_WORKSPACE_PATH'"

echo "Step 4: Check code-server container"
echo "-----------------------------------"
test_step "code-server container is running" "docker ps | grep -q claude-code-server"
test_step "code-server has Docker CLI installed" "docker exec claude-code-server which docker"
test_step "code-server can connect to DinD" "docker exec claude-code-server docker info"

echo "Step 5: Check workspace volumes"
echo "-----------------------------------"
test_step "Workspace volume exists" "docker volume inspect claude-workspace"
test_step_output "Backend workspace mount" "docker exec claude-backend ls -la /app/workspace"
test_step_output "code-server workspace mount" "docker exec claude-code-server ls -la /home/coder/workspace"
test_step_output "DinD workspace mount" "docker exec claude-dind ls -la /workspaces"

echo "Step 6: Check DinD Executor"
echo "-----------------------------------"
test_step "DinD executor file exists" "docker exec claude-backend test -f /app/app/utils/dind_executor.py"
test_step_output "DinD executor import test" "docker exec claude-backend python3 -c 'from app.utils.dind_executor import get_executor; print(\"Import successful\")'"

echo "Step 7: Functional test - Execute Python code via DinD"
echo "-----------------------------------"
test_step_output "Execute simple Python code" "docker exec claude-backend python3 -c '
from app.utils.dind_executor import get_executor

executor = get_executor()

if not executor.is_available():
    print(\"ERROR: DinD is not available\")
    exit(1)

result = executor.run_python_code(
    code=\"print(\\\"Hello from DinD!\\\")\",
    python_version=\"3.11\",
)

if result[\"returncode\"] == 0:
    print(\"SUCCESS: Code executed successfully\")
    print(f\"Output: {result[\\\"stdout\\\"]}\")
else:
    print(f\"ERROR: {result[\\\"stderr\\\"]}\")
    exit(1)
'"

echo "Step 8: Network connectivity test"
echo "-----------------------------------"
test_step "Backend can reach DinD on port 2375" "docker exec claude-backend nc -zv dind 2375"
test_step "code-server can reach DinD on port 2375" "docker exec claude-code-server nc -zv dind 2375"

echo "Step 9: Check DinD storage"
echo "-----------------------------------"
test_step "DinD storage volume exists" "docker volume inspect claude-dind-storage"
test_step_output "DinD storage info" "docker exec claude-dind du -sh /var/lib/docker"

echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! DinD environment is correctly configured.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the configuration.${NC}"
    exit 1
fi
