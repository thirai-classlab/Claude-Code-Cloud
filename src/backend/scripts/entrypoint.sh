#!/bin/bash
set -e

echo "Starting Claude Code Backend..."

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
while ! nc -z ${DATABASE_HOST:-mysql} ${DATABASE_PORT:-3306}; do
  sleep 1
done
echo "MySQL is ready!"

# Run database migrations
echo "Running database migrations..."
python -c "
import asyncio
from app.models.database import init_db

async def migrate():
    await init_db()
    print('Database migration completed!')

asyncio.run(migrate())
"

# Start the application
echo "Starting uvicorn..."
exec "$@"
