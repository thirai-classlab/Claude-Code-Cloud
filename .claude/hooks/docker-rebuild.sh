#!/bin/bash

# Docker Rebuild Hook for Claude Code
# Automatically rebuilds Docker containers when source files are modified

set -e

# Read the JSON input from stdin
input=$(cat)

# Extract the file path that was just modified
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# If no file path, exit silently
if [[ -z "$file_path" ]]; then
    exit 0
fi

# Change to project directory
cd "$CLAUDE_PROJECT_DIR"

# Function to rebuild and restart a container
rebuild_container() {
    local service=$1
    echo "Rebuilding $service container..."

    # Build the container
    if docker-compose build "$service" 2>&1; then
        echo "$service build successful, restarting container..."
        docker-compose up -d "$service"

        # Wait for health check
        echo "Waiting for $service to be healthy..."
        for i in {1..30}; do
            status=$(docker-compose ps --format json | jq -r ".[] | select(.Service == \"$service\") | .Health" 2>/dev/null || echo "unknown")
            if [[ "$status" == "healthy" ]]; then
                echo "$service is healthy!"
                exit 0
            fi
            sleep 2
        done
        echo "Warning: $service health check timeout, but container is running"
    else
        echo "ERROR: $service build failed!"
        exit 1
    fi
}

# Check if the file is in src/frontend or src/backend
if [[ "$file_path" =~ src/frontend/ ]]; then
    rebuild_container "frontend"
elif [[ "$file_path" =~ src/backend/ ]]; then
    rebuild_container "backend"
fi

exit 0
