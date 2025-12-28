#!/bin/bash
# Stop Claude Code services

echo "Stopping Claude Code services..."

docker-compose down

echo "✓ Services stopped successfully"
