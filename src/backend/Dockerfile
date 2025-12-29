# Multi-stage build for Python FastAPI backend
# Target: production, development

# ============================================
# Base Stage: Common dependencies
# ============================================
FROM python:3.11-slim as base

# Metadata
LABEL maintainer="claude-code@example.com"
LABEL description="Claude Code Backend - FastAPI with Agent SDK"
LABEL version="1.0"

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.7.1 \
    POETRY_HOME=/opt/poetry \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    NODE_VERSION=20

# Install system dependencies including Docker CLI and Node.js
# Note: Node.js is required by claude-agent-sdk (CLI is bundled with the SDK)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    ca-certificates \
    docker.io \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /opt/poetry/bin/poetry /usr/local/bin/poetry

# Create non-root user
RUN groupadd -r appuser -g 1000 && \
    useradd -r -u 1000 -g appuser -m -s /bin/bash appuser

# Set working directory
WORKDIR /app

# ============================================
# Dependencies Stage: Install Python packages
# ============================================
FROM base as dependencies

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install dependencies (production only)
RUN poetry lock --no-update && poetry install --no-root --only main --no-interaction --no-ansi

# ============================================
# Development Stage: Full development setup
# ============================================
FROM base as development

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install all dependencies (including dev)
RUN poetry install --no-root --with dev

# Copy application code
COPY --chown=appuser:appuser ./app /app/app

# Create workspace directory
RUN mkdir -p /app/workspace && chown -R appuser:appuser /app/workspace

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Development command (can be overridden)
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================
# Production Stage: Optimized production image
# ============================================
FROM base as production

# Copy virtual environment from dependencies stage
COPY --from=dependencies /app/.venv /app/.venv

# Copy application code
COPY --chown=appuser:appuser ./app /app/app

# Create workspace directory
RUN mkdir -p /app/workspace && chown -R appuser:appuser /app/workspace

# Switch to non-root user
USER appuser

# Add virtual environment to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Production command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# ============================================
# Testing Stage: For CI/CD testing
# ============================================
FROM development as testing

# Copy test files
COPY --chown=appuser:appuser ./tests /app/tests

USER appuser

# Run tests
CMD ["poetry", "run", "pytest", "-v", "--cov=app", "--cov-report=term-missing"]
