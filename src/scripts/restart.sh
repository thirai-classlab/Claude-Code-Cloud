#!/bin/bash
# Restart Claude Code services

echo "Restarting Claude Code services..."

docker-compose restart

echo "✓ Services restarted successfully"
docker-compose ps
