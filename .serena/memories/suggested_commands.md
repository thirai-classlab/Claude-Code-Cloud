# Suggested Commands for Development

## Docker Commands (via Makefile)

### Basic Operations
```bash
make build       # Build all Docker images
make up          # Start all services (standard mode)
make dev         # Start in development mode (hot reload)
make down        # Stop all services
make restart     # Restart all services
make logs        # View all logs
make status      # Check service status
```

### Service-Specific
```bash
make logs-backend    # View backend logs only
make logs-frontend   # View frontend logs only
make shell-backend   # Open backend shell
make shell-frontend  # Open frontend shell
```

### Testing
```bash
make test            # Run backend tests (poetry run pytest)
```

### DinD (Docker-in-Docker)
```bash
make dind-up         # Start DinD services
make up-with-dind    # Start all services with DinD
make dind-down       # Stop DinD services
make dind-logs       # Show DinD logs
make dind-clean      # Clean DinD storage
make dind-test       # Test DinD connectivity
make dind-stats      # Show DinD statistics
```

### Cleanup
```bash
make clean           # Clean up resources (docker-compose down -v --rmi local)
```

## Backend Development (Python)

### Testing & Quality
```bash
poetry run pytest                        # Run tests
poetry run pytest --cov=app             # Run tests with coverage
poetry run black .                      # Format code
poetry run isort .                      # Sort imports
poetry run flake8                       # Lint code
poetry run mypy .                       # Type checking
```

### Configuration
- Line length: 100
- Python version: 3.11
- Async test mode: auto

## Frontend Development (Node.js)

### Scripts
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Lint code (next lint)
npm run type-check  # TypeScript type checking
```

## Access URLs
| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main UI |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| code-server | http://localhost:8080 | VSCode Web |

## System Commands (macOS/Darwin)
- ls, cd, grep, find - Standard Unix commands
- git - Version control
- docker, docker-compose - Container management
