# Web版Claude Code - Docker/インフラ設計書

**作成日:** 2025-12-20
**最終更新:** 2026-01-02
**バージョン:** 1.3
**ステータス:** 完了（100%）

---

## 目次

1. [概要](#1-概要)
   - [1.1 インフラ構成図](#11-インフラ構成図)
   - [1.2 設計原則](#12-設計原則)
2. [Docker Compose構成](#2-docker-compose構成)
   - [2.1 完全版 docker-compose.yml](#21-完全版-docker-composeyml)
   - [2.2 開発用 docker-compose.dev.yml](#22-開発用-docker-composedevyml)
3. [Dockerfile設計](#3-dockerfile設計)
   - [3.1 Backend Dockerfile](#31-backend-dockerfile)
   - [3.2 Backend requirements.txt](#32-backend-requirementstxt-alternative-to-poetry)
   - [3.3 Frontend Dockerfile](#33-frontend-dockerfile)
   - [3.4 .dockerignore (Backend)](#34-dockerignore-backend)
   - [3.5 .dockerignore (Frontend)](#35-dockerignore-frontend)
4. [環境変数設計](#4-環境変数設計)
   - [4.1 .env.example (Root)](#41-envexample-root)
   - [4.2 .env.development](#42-envdevelopment)
   - [4.3 .env.production](#43-envproduction)
   - [4.4 環境変数バリデーション](#44-環境変数バリデーション)
5. [ボリューム設計](#5-ボリューム設計)
   - [5.1 ボリューム構成](#51-ボリューム構成)
   - [5.2 Workspace ディレクトリ構造](#52-workspace-ディレクトリ構造)
   - [5.3 ボリュームバックアップ戦略](#53-ボリュームバックアップ戦略)
6. [ネットワーク設計](#6-ネットワーク設計)
   - [6.1 ネットワーク構成](#61-ネットワーク構成)
   - [6.2 サービス間通信](#62-サービス間通信)
   - [6.3 ネットワークセキュリティ](#63-ネットワークセキュリティ)
7. [セキュリティ考慮事項](#7-セキュリティ考慮事項)
   - [7.1 セキュリティチェックリスト](#71-セキュリティチェックリスト)
   - [7.2 非rootユーザー実行](#72-非rootユーザー実行)
   - [7.3 シークレット管理 (Docker Secrets)](#73-シークレット管理-docker-secrets)
   - [7.4 セキュリティスキャン](#74-セキュリティスキャン)
8. [運用設計](#8-運用設計)
   - [8.1 ヘルスチェック](#81-ヘルスチェック)
   - [8.2 ログ設計](#82-ログ設計)
   - [8.3 メトリクス収集](#83-メトリクス収集)
   - [8.4 コンテナリビルドルール](#84-コンテナリビルドルール必須)
   - [8.5 起動・停止スクリプト](#85-起動停止スクリプト)
9. [スケーリング戦略](#9-スケーリング戦略)
   - [9.1 水平スケーリング](#91-水平スケーリング)
   - [9.2 リソース最適化](#92-リソース最適化)
   - [9.3 Kubernetes移行パス](#93-kubernetes移行パス)
10. [トラブルシューティング](#10-トラブルシューティング)
    - [10.1 よくある問題と解決策](#101-よくある問題と解決策)
    - [10.2 デバッグコマンド](#102-デバッグコマンド)
    - [10.3 パフォーマンス診断](#103-パフォーマンス診断)
    - [10.4 クリーンアップ](#104-クリーンアップ)
11. [Docker-in-Docker (DinD) 設計](#11-docker-in-docker-dind-設計)
    - [11.1 DinD概要](#111-dind概要)
    - [11.2 DinDアーキテクチャ](#112-dindアーキテクチャ)
    - [11.3 DinDの利点](#113-dindの利点)
    - [11.4 docker-compose.dind.yml](#114-docker-composedindyml)
    - [11.5 DinD Executor](#115-dind-executor)
    - [11.6 セキュリティ考慮事項](#116-セキュリティ考慮事項)
    - [11.7 DinD関連コマンド](#117-dind関連コマンド)
    - [11.8 関連ドキュメント](#118-関連ドキュメント)
- [付録](#付録)
  - [A. MySQL設定](#a-mysql設定)
  - [B. Makefile](#b-makefile)
  - [C. CI/CD パイプライン例](#c-cicd-パイプライン例-github-actions)
- [まとめ](#まとめ)
- [変更履歴](#変更履歴)

---

## 1. 概要

### 1.1 インフラ構成図

```mermaid
flowchart TB
    subgraph Host["Host Machine"]
        subgraph Network["Docker Compose Network: claude-network (bridge)"]
            subgraph Containers["コンテナ群"]
                FE["frontend<br/>(Next.js)<br/>Port: 3000<br/>User: node"]
                BE["backend<br/>(FastAPI)<br/>Port: 8000<br/>User: appuser"]
                CS["code-server<br/>(VSCode)<br/>Port: 8080<br/>User: coder"]
                DB["mysql<br/>(8.0)<br/>Port: 3306<br/>User: mysql"]
            end

            subgraph Volumes["ボリューム"]
                WV["workspace-data<br/>/app/workspace<br/>(backend & code-server共有)"]
                MV["mysql-data<br/>/var/lib/mysql"]
            end
        end

        subgraph HostPorts["Host Ports"]
            HP1["3000:3000 (Frontend)"]
            HP2["8000:8000 (Backend API)"]
            HP3["8080:8080 (code-server)"]
            HP4["3306:3306 (MySQL - debug用)"]
        end
    end

    BE --> WV
    CS --> WV
    DB --> MV

    HP1 -.-> FE
    HP2 -.-> BE
    HP3 -.-> CS
    HP4 -.-> DB
```

```mermaid
classDiagram
    class コンテナ構成 {
        frontend: Next.js 20.11-alpine, Port 3000, User node
        backend: FastAPI Python 3.11-slim, Port 8000, User appuser
        code-server: VSCode Web 4.96.2, Port 8080, User coder
        mysql: MySQL 8.0, Port 3306, User mysql
    }
```

### 1.2 設計原則

```mermaid
flowchart LR
    subgraph 設計原則
        A[セキュリティファースト] --> A_D[非rootユーザー実行、シークレット分離、最小権限]
        B[再現性] --> B_D[イミュータブルなビルド、バージョン固定]
        C[スケーラビリティ] --> C_D[ステートレス設計、水平スケール対応]
        D[可観測性] --> D_D[ログ集約、ヘルスチェック、メトリクス収集]
        E[開発効率] --> E_D[ホットリロード、高速ビルド、デバッグ容易性]
    end
```

---

## 2. Docker Compose構成

### 2.1 完全版 docker-compose.yml

```yaml
version: '3.9'

services:
  # Frontend Service (Next.js)
  frontend:
    container_name: claude-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: ${BUILD_TARGET:-production}
      args:
        - NODE_VERSION=20.11
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
        - NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
      - NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-ws://localhost:8000}
      - NEXT_TELEMETRY_DISABLED=1
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - claude-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.example.description=Claude Code Frontend"
      - "com.example.service=frontend"

  # Backend Service (FastAPI)
  backend:
    container_name: claude-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: ${BUILD_TARGET:-production}
      args:
        - PYTHON_VERSION=3.11
        - CLAUDE_CODE_VERSION=latest
    ports:
      - "${BACKEND_PORT:-8000}:8000"
    environment:
      # Application
      - ENVIRONMENT=${ENVIRONMENT:-production}
      - DEBUG=${DEBUG:-false}
      - LOG_LEVEL=${LOG_LEVEL:-info}

      # Claude API (API keys are managed per-project in DB)
      - CLAUDE_MODEL=${CLAUDE_MODEL:-claude-sonnet-4-20250514}
      - MAX_TOKENS=${MAX_TOKENS:-16000}

      # MySQL
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - MYSQL_USER=claude
      - MYSQL_PASSWORD=${MYSQL_PASSWORD:-claude_password}
      - MYSQL_DATABASE=claude_code

      # Session
      - SESSION_TIMEOUT=${SESSION_TIMEOUT:-3600}
      - MAX_SESSIONS=${MAX_SESSIONS:-100}

      # Security
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000}
      - SECRET_KEY=${SECRET_KEY:?SECRET_KEY is required}

      # Workspace
      - WORKSPACE_PATH=/app/workspace
      - MAX_FILE_SIZE=${MAX_FILE_SIZE:-10485760}

      # Rate Limiting
      - RATE_LIMIT_PER_MINUTE=${RATE_LIMIT_PER_MINUTE:-30}
    volumes:
      - workspace-data:/app/workspace:rw
      - ./src/backend/app:/app/app:ro  # Development only
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - claude-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    labels:
      - "com.example.description=Claude Code Backend API"
      - "com.example.service=backend"
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # MySQL Service (Database)
  mysql:
    container_name: claude-mysql
    image: mysql:8.0
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-root_password}
      - MYSQL_DATABASE=claude_code
      - MYSQL_USER=claude
      - MYSQL_PASSWORD=${MYSQL_PASSWORD:-claude_password}
    volumes:
      - mysql-data:/var/lib/mysql:rw
    networks:
      - claude-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-root_password}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    labels:
      - "com.example.description=MySQL Database"
      - "com.example.service=mysql"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M

  # code-server Service (VSCode Web)
  code-server:
    container_name: claude-code-server
    image: codercom/code-server:4.96.2
    ports:
      - "${CODE_SERVER_PORT:-8080}:8080"
    environment:
      - DOCKER_USER=coder
      - PASSWORD=${CODE_SERVER_PASSWORD:-}
      - HASHED_PASSWORD=${CODE_SERVER_HASHED_PASSWORD:-}
      - SUDO_PASSWORD=${CODE_SERVER_SUDO_PASSWORD:-}
      - PROXY_DOMAIN=${CODE_SERVER_PROXY_DOMAIN:-}
      - DEFAULT_WORKSPACE=/home/coder/workspace
    volumes:
      - workspace-data:/home/coder/workspace:rw
      - code-server-data:/home/coder/.local/share/code-server:rw
      - code-server-config:/home/coder/.config/code-server:rw
    networks:
      - claude-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    labels:
      - "com.example.description=Claude Code - VSCode Web Editor"
      - "com.example.service=code-server"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

# Volumes
volumes:
  workspace-data:
    driver: local
    name: claude-workspace
    driver_opts:
      type: none
      o: bind
      device: ${WORKSPACE_HOST_PATH:-./workspace}

  mysql-data:
    driver: local
    name: claude-mysql-data

  code-server-data:
    driver: local
    name: claude-code-server-data

# Networks
networks:
  claude-network:
    name: claude-network
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

### 2.2 開発用 docker-compose.dev.yml

```yaml
version: '3.9'

services:
  frontend:
    build:
      target: development
    volumes:
      - ./src/frontend:/app:cached
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
    command: npm run dev

  backend:
    build:
      target: development
    volumes:
      - ./src/backend:/app:cached
      - /app/.venv
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - LOG_LEVEL=debug
      - RELOAD=true
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  mysql:
    ports:
      - "3306:3306"
```

---

## 3. Dockerfile設計

### 3.1 Backend Dockerfile

```dockerfile
# Multi-stage build for Python FastAPI backend
# Target: production, development

# ============================================
# Base Stage: Common dependencies
# ============================================
FROM python:3.11-slim as base

# Metadata
LABEL maintainer="your-team@example.com"
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
    POETRY_VIRTUALENVS_IN_PROJECT=true

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    ca-certificates \
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
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry install --no-root --no-dev --no-interaction --no-ansi

# ============================================
# Development Stage: Full development setup
# ============================================
FROM base as development

# Copy dependency files
COPY pyproject.toml poetry.lock ./

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
```

### 3.2 Backend requirements.txt (Alternative to Poetry)

```txt
# Core Framework
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9

# Claude Agent SDK
anthropic==0.39.0
# Note: Claude Code CLI is installed separately if needed

# Database
SQLAlchemy==2.0.23
aiomysql==0.2.0
mysqlclient==2.2.0

# Data Validation
pydantic==2.9.2
pydantic-settings==2.5.2

# Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1

# CORS
python-cors==1.0.0

# Logging & Monitoring
structlog==24.4.0
python-json-logger==2.0.7

# Utilities
aiofiles==23.2.1
httpx==0.27.2
tenacity==9.0.0

# WebSocket
websockets==12.0
```

### 3.3 Frontend Dockerfile

```dockerfile
# Multi-stage build for Next.js frontend
# Target: production, development

# ============================================
# Base Stage: Common Node.js setup
# ============================================
FROM node:20.11-alpine as base

# Metadata
LABEL maintainer="your-team@example.com"
LABEL description="Claude Code Frontend - Next.js UI"
LABEL version="1.0"

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# ============================================
# Dependencies Stage: Install Node modules
# ============================================
FROM base as dependencies

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Builder Stage: Build Next.js application
# ============================================
FROM base as builder

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# ============================================
# Development Stage: Full development setup
# ============================================
FROM base as development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Development command
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# ============================================
# Production Stage: Optimized production image
# ============================================
FROM base as production

# Set production environment
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Production command
CMD ["npm", "start"]
```

### 3.4 .dockerignore (Backend)

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
*.egg-info/
dist/
build/
.eggs/
.venv/
venv/

# Testing
.pytest_cache/
.coverage
htmlcov/
*.cover

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.*
!.env.example

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Documentation
README.md
docs/

# Git
.git/
.gitignore
```

### 3.5 .dockerignore (Frontend)

```
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/

# Testing
coverage/
.nyc_output

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env*
!.env.example

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Git
.git/
.gitignore

# Documentation
README.md
docs/
```

---

## 4. 環境変数設計

### 4.1 .env.example (Root)

```bash
# ================================================
# Claude Code - Environment Configuration
# ================================================

# ----------------
# Build Settings
# ----------------
BUILD_TARGET=production  # production | development
COMPOSE_PROJECT_NAME=claude-code

# ----------------
# Service Ports
# ----------------
FRONTEND_PORT=3000
BACKEND_PORT=8000
MYSQL_PORT=3306
CODE_SERVER_PORT=8080

# ----------------
# Frontend Environment
# ----------------
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# ----------------
# Backend Environment
# ----------------
ENVIRONMENT=production  # production | development | staging
DEBUG=false
LOG_LEVEL=info  # debug | info | warning | error

# ----------------
# Claude API Configuration
# ----------------
# Note: API keys are managed per-project in the database
CLAUDE_MODEL=claude-sonnet-4-20250514
MAX_TOKENS=16000

# ----------------
# MySQL Configuration
# ----------------
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=claude
MYSQL_PASSWORD=claude_password
MYSQL_DATABASE=claude_code
MYSQL_ROOT_PASSWORD=root_password

# ----------------
# Session Management
# ----------------
SESSION_TIMEOUT=3600  # seconds (1 hour)
MAX_SESSIONS=100
SECRET_KEY=your-secret-key-here-min-32-chars  # Generate: openssl rand -hex 32

# ----------------
# Security
# ----------------
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_ALLOW_CREDENTIALS=true

# ----------------
# Workspace Configuration
# ----------------
WORKSPACE_HOST_PATH=./workspace
MAX_FILE_SIZE=10485760  # 10MB in bytes

# ----------------
# code-server Configuration (VSCode Web)
# ----------------
CODE_SERVER_PASSWORD=  # Leave empty for no password (development only)
CODE_SERVER_HASHED_PASSWORD=  # Use argon2 hash for production: echo -n "password" | npx argon2-cli -e
CODE_SERVER_SUDO_PASSWORD=  # Optional: sudo password for terminal
CODE_SERVER_PROXY_DOMAIN=  # Optional: for subdomain proxying

# ----------------
# Rate Limiting
# ----------------
RATE_LIMIT_PER_MINUTE=30

# ----------------
# Monitoring & Logging
# ----------------
ENABLE_METRICS=true
SENTRY_DSN=  # Optional: Sentry error tracking
```

### 4.2 .env.development

```bash
# Development-specific overrides
BUILD_TARGET=development
NODE_ENV=development
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug

# Allow hot reload
RELOAD=true

# Development URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Relaxed security for development
ALLOWED_ORIGINS=*
RATE_LIMIT_PER_MINUTE=1000
```

### 4.3 .env.production

```bash
# Production-specific settings
BUILD_TARGET=production
NODE_ENV=production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=warning

# Production URLs (replace with your domain)
NEXT_PUBLIC_API_URL=https://api.claude-code.example.com
NEXT_PUBLIC_WS_URL=wss://api.claude-code.example.com

# Strict security
ALLOWED_ORIGINS=https://claude-code.example.com
RATE_LIMIT_PER_MINUTE=30
```

### 4.4 環境変数バリデーション

Backend側で環境変数を検証するPydantic設定:

```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Literal, Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    environment: Literal["development", "staging", "production"] = "production"
    debug: bool = False
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    # Claude API (API keys are managed per-project in database)
    claude_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 16000

    # MySQL
    mysql_host: str = "mysql"
    mysql_port: int = 3306
    mysql_user: str = "claude"
    mysql_password: str = "claude_password"
    mysql_database: str = "claude_code"

    # Session
    session_timeout: int = 3600
    max_sessions: int = 100
    secret_key: str

    # Security
    allowed_origins: List[str] = ["http://localhost:3000"]

    # Workspace
    workspace_path: str = "/app/workspace"
    max_file_size: int = 10485760

    # Rate Limiting
    rate_limit_per_minute: int = 30

    @property
    def database_url(self) -> str:
        return f"mysql+aiomysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Validation
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")

settings = Settings()
```

---

## 5. ボリューム設計

### 5.1 ボリューム構成

```mermaid
flowchart TD
    subgraph ボリューム構成
        V1[workspace-data] --> V1_T[タイプ: Named/Bind]
        V1_T --> V1_M[マウント先: /app/workspace, /home/coder/workspace]
        V1_M --> V1_U[用途: ユーザーのプロジェクトファイル backend + code-server共有]
        V1_U --> V1_P[パーミッション: rw 1000:1000]

        V2[mysql-data] --> V2_T[タイプ: Named]
        V2_T --> V2_M[マウント先: /var/lib/mysql]
        V2_M --> V2_U[用途: MySQL永続化データ]
        V2_U --> V2_P[パーミッション: rw mysql:mysql]

        V3[backend-app] --> V3_T[タイプ: Bind dev]
        V3_T --> V3_M[マウント先: /app/app]
        V3_M --> V3_U[用途: バックエンドコード 開発時]
        V3_U --> V3_P[パーミッション: ro read-only]

        V4[frontend-src] --> V4_T[タイプ: Bind dev]
        V4_T --> V4_M[マウント先: /app]
        V4_M --> V4_U[用途: フロントエンドコード 開発時]
        V4_U --> V4_P[パーミッション: cached]

        V5[code-server-data] --> V5_T[タイプ: Named]
        V5_T --> V5_M[マウント先: /home/coder/.local/share/code-server]
        V5_M --> V5_U[用途: VSCode拡張機能、設定データ]
        V5_U --> V5_P[パーミッション: rw coder:coder]
    end
```

### 5.2 Workspace ディレクトリ構造

```
workspace/
├── sessions/
│   ├── session-abc123/
│   │   ├── files/
│   │   │   ├── main.py
│   │   │   └── utils.py
│   │   ├── .claude/
│   │   │   └── history.json
│   │   └── metadata.json
│   └── session-def456/
├── shared/
│   ├── templates/
│   └── libraries/
└── .gitignore
```

### 5.3 ボリュームバックアップ戦略

```bash
#!/bin/bash
# backup-volumes.sh

BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup workspace
docker run --rm \
  -v claude-workspace:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/workspace-$(date +%H%M%S).tar.gz -C /data .

# Backup MySQL
docker exec claude-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD:-root_password}" \
  --all-databases > "$BACKUP_DIR/mysql-$(date +%H%M%S).sql"

echo "Backup completed: $BACKUP_DIR"
```

---

## 6. ネットワーク設計

### 6.1 ネットワーク構成

```yaml
networks:
  claude-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
    driver_opts:
      com.docker.network.bridge.name: br-claude
      com.docker.network.bridge.enable_icc: "true"
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.driver.mtu: "1500"
```

### 6.2 サービス間通信

```mermaid
flowchart LR
    subgraph サービス間通信
        F[frontend] -->|HTTP/WS:8000| B[backend]
        F -->|iframe:8080| CS[code-server]
        B -->|MySQL Protocol:3306| DB[mysql]
        H[host] -->|HTTP:3000| F
        H -->|HTTP:8000 開発時| B
        H -->|HTTP:8080| CS
    end

    subgraph 用途
        F -.-> F_D[API/WebSocket通信]
        B -.-> B_D[データベース/セッション]
        CS -.-> CS_D[VSCode Web エディタ]
        H -.-> H_D1[ユーザーアクセス]
        H -.-> H_D2[直接APIアクセス]
    end
```

### 6.3 ネットワークセキュリティ

```yaml
# docker-compose.yml (セキュリティ強化版)
services:
  frontend:
    networks:
      claude-network:
        ipv4_address: 172.28.0.10

  backend:
    networks:
      claude-network:
        ipv4_address: 172.28.0.20
    expose:
      - "8000"  # 内部のみ公開
    # ports:  # 本番環境ではポート公開を削除

  code-server:
    networks:
      claude-network:
        ipv4_address: 172.28.0.25
    expose:
      - "8080"  # フロントエンドからのiframe埋め込み用
    # 本番環境ではリバースプロキシ経由でのアクセスを推奨

  mysql:
    networks:
      claude-network:
        ipv4_address: 172.28.0.30
    expose:
      - "3306"  # 内部のみ公開
    # ports:  # MySQLは外部公開しない
```

---

## 7. セキュリティ考慮事項

### 7.1 セキュリティチェックリスト

```mermaid
flowchart TD
    subgraph セキュリティチェックリスト
        C1[コンテナセキュリティ]
        C1 --> C1_1[完了: 非rootユーザー実行 - 全サービス]
        C1 --> C1_2[完了: 最小限のベースイメージ alpine - Node]
        C1 --> C1_3[検討中: 読み取り専用ファイルシステム]
        C1 --> C1_4[検討中: Capability削減]

        C2[シークレット管理]
        C2 --> C2_1[完了: .envファイル除外 .gitignore]
        C2 --> C2_2[検討中: Docker secrets使用 - 本番環境]
        C2 --> C2_3[完了: 環境変数検証 - Pydantic]

        C3[ネットワーク]
        C3 --> C3_1[完了: 内部通信のみ許可]
        C3 --> C3_2[検討中: TLS/SSL対応 - リバースプロキシ]

        C4[イメージ]
        C4 --> C4_1[検討中: 脆弱性スキャン Trivy - CI/CD]
        C4 --> C4_2[検討中: 定期的な更新 - 運用プロセス]

        C5[アクセス制御]
        C5 --> C5_1[完了: CORS設定 - FastAPI]
        C5 --> C5_2[完了: レート制限 - middleware]
    end
```

### 7.2 非rootユーザー実行

すべてのサービスで非rootユーザーを使用:

```dockerfile
# Backend
RUN groupadd -r appuser -g 1000 && \
    useradd -r -u 1000 -g appuser -m -s /bin/bash appuser
USER appuser

# Frontend
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

# MySQL
# 公式イメージがデフォルトでmysqlユーザー使用
```

### 7.3 シークレット管理 (Docker Secrets)

本番環境向けDocker Secrets対応:

```yaml
# docker-compose.production.yml
version: '3.9'

services:
  backend:
    secrets:
      - secret_key
      - mysql_password
    environment:
      - SECRET_KEY_FILE=/run/secrets/secret_key
      - MYSQL_PASSWORD_FILE=/run/secrets/mysql_password

  mysql:
    secrets:
      - mysql_root_password
      - mysql_password
    environment:
      - MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root_password
      - MYSQL_PASSWORD_FILE=/run/secrets/mysql_password

secrets:
  secret_key:
    external: true
  mysql_password:
    external: true
  mysql_root_password:
    external: true
```

```python
# backend/app/config.py (Secrets対応)
import os
from pathlib import Path

def read_secret(name: str, default: str = "") -> str:
    """Read secret from file or environment variable"""
    secret_file = os.getenv(f"{name}_FILE")
    if secret_file and Path(secret_file).exists():
        return Path(secret_file).read_text().strip()
    return os.getenv(name, default)

class Settings(BaseSettings):
    secret_key: str = Field(default_factory=lambda: read_secret("SECRET_KEY"))
    mysql_password: str = Field(default_factory=lambda: read_secret("MYSQL_PASSWORD"))
```

### 7.4 セキュリティスキャン

```bash
#!/bin/bash
# security-scan.sh

# Trivy によるイメージスキャン
echo "Scanning backend image..."
trivy image --severity HIGH,CRITICAL claude-backend:latest

echo "Scanning frontend image..."
trivy image --severity HIGH,CRITICAL claude-frontend:latest

echo "Scanning mysql image..."
trivy image --severity HIGH,CRITICAL mysql:8.0

# Dependency vulnerability check
echo "Checking Python dependencies..."
cd src/backend && poetry export -f requirements.txt | safety check --stdin

echo "Checking Node.js dependencies..."
cd ../frontend && npm audit --production
```

---

## 8. 運用設計

### 8.1 ヘルスチェック

各サービスのヘルスチェック実装:

```python
# backend/app/api/routes/health.py
from fastapi import APIRouter, status
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "services": {}
    }

    # Check MySQL
    try:
        async with get_db() as db:
            await db.execute(text("SELECT 1"))
        health_status["services"]["mysql"] = "healthy"
    except Exception as e:
        health_status["services"]["mysql"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Claude API (optional)
    # Check disk space
    # Check memory usage

    return health_status

@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness probe for Kubernetes"""
    return {"status": "ready"}

@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """Liveness probe for Kubernetes"""
    return {"status": "alive"}
```

### 8.2 ログ設計

構造化ログ設定:

```python
# backend/app/core/logging.py
import structlog
from app.config import settings

def configure_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()
```

ログローテーション設定:

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"
```

### 8.3 メトリクス収集

Prometheus互換のメトリクス:

```python
# backend/app/middleware/metrics.py
from prometheus_client import Counter, Histogram, Gauge
from fastapi import Request
import time

# メトリクス定義
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

active_sessions = Gauge(
    'active_sessions',
    'Number of active sessions'
)

async def metrics_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    http_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    http_request_duration_seconds.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response
```

### 8.4 コンテナリビルドルール（必須）

**変更があったコンテナのみをリビルドすること。全体リビルドは禁止。**

```mermaid
flowchart LR
    subgraph RebuildRules["コンテナリビルドルール"]
        R1[変更検出] --> R2{どのサービスが変更?}
        R2 -->|frontend| R3[frontendのみリビルド]
        R2 -->|backend| R4[backendのみリビルド]
        R2 -->|両方| R5[frontend + backendリビルド]
        R2 -->|MySQL/DinD/code-server| R6[通常リビルド不要]

        R3 --> B1[build frontend → up -d frontend]
        R4 --> B2[build backend → up -d backend]
        R5 --> B3[build frontend backend → up -d frontend backend]
    end
```

```bash
# フロントエンドのみ変更した場合
docker-compose -f docker-compose.yml -f docker-compose.dind.yml build frontend
docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d frontend

# バックエンドのみ変更した場合
docker-compose -f docker-compose.yml -f docker-compose.dind.yml build backend
docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d backend

# 両方変更した場合
docker-compose -f docker-compose.yml -f docker-compose.dind.yml build frontend backend
docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d frontend backend
```

| オプション | 使用タイミング |
|-----------|---------------|
| `build <service>` | 通常のリビルド（キャッシュ使用） |
| `build --no-cache <service>` | Dockerfile変更時、依存関係更新時のみ |
| `up -d <service>` | 該当サービスのみ再起動 |

**注意事項:**
- `docker-compose build` (サービス指定なし) は使用禁止
- `--no-cache` は必要な場合のみ使用（ビルド時間短縮のため）
- MySQL, DinD, code-server は通常リビルド不要

---

### 8.5 起動・停止スクリプト

```bash
#!/bin/bash
# scripts/start.sh

set -e

echo "Starting Claude Code services..."

# 環境変数チェック
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Docker Composeでサービス起動
docker-compose up -d

# ヘルスチェック
echo "Waiting for services to be healthy..."
timeout 60 bash -c '
while true; do
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done
'

echo "All services are up and healthy!"
docker-compose ps
```

```bash
#!/bin/bash
# scripts/stop.sh

echo "Stopping Claude Code services..."

docker-compose down

echo "Services stopped successfully"
```

```bash
#!/bin/bash
# scripts/restart.sh

echo "Restarting Claude Code services..."

docker-compose restart

echo "Services restarted successfully"
```

---

## 9. スケーリング戦略

### 9.1 水平スケーリング

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

```bash
# スケールコマンド
docker-compose up -d --scale backend=3
```

### 9.2 リソース最適化

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 9.3 Kubernetes移行パス

```yaml
# kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claude-backend
  template:
    metadata:
      labels:
        app: claude-backend
    spec:
      containers:
      - name: backend
        image: claude-backend:1.0
        ports:
        - containerPort: 8000
        env:
        - name: MYSQL_HOST
          value: mysql-service
        - name: MYSQL_PORT
          value: "3306"
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: claude-secrets
              key: mysql-password
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /api/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

---

## 10. トラブルシューティング

### 10.1 よくある問題と解決策

```mermaid
flowchart LR
    subgraph よくある問題と解決策
        P1[Backend起動失敗]
        P1 --> P1_C[原因: SECRET_KEY未設定]
        P1_C --> P1_S[解決策: .envファイル確認、環境変数設定]

        P2[MySQL接続エラー]
        P2 --> P2_C[原因: MySQLコンテナ未起動]
        P2_C --> P2_S[解決策: docker-compose up -d mysql]

        P3[Frontend接続エラー]
        P3 --> P3_C[原因: Backend URL誤設定]
        P3_C --> P3_S[解決策: NEXT_PUBLIC_API_URL確認]

        P4[ボリュームパーミッションエラー]
        P4 --> P4_C[原因: UID/GID不一致]
        P4_C --> P4_S[解決策: chown -R 1000:1000 workspace/]

        P5[ポート競合]
        P5 --> P5_C[原因: 既に使用中のポート]
        P5_C --> P5_S[解決策: .envでポート変更]
    end
```

### 10.2 デバッグコマンド

```bash
# ログ確認
docker-compose logs -f backend
docker-compose logs -f frontend --tail=100

# コンテナ内でシェル実行
docker-compose exec backend bash
docker-compose exec frontend sh

# ネットワーク診断
docker network inspect claude-network

# ボリューム確認
docker volume ls
docker volume inspect claude-workspace

# リソース使用状況
docker stats

# サービス再起動
docker-compose restart backend
```

### 10.3 パフォーマンス診断

```bash
#!/bin/bash
# scripts/diagnostics.sh

echo "=== Docker Resource Usage ==="
docker stats --no-stream

echo -e "\n=== Service Health ==="
curl -s http://localhost:8000/api/health | jq

echo -e "\n=== MySQL Status ==="
docker-compose exec mysql mysqladmin -u root -p"${MYSQL_ROOT_PASSWORD:-root_password}" status

echo -e "\n=== Container Logs (Last 50 lines) ==="
docker-compose logs --tail=50 backend

echo -e "\n=== Network Connectivity ==="
docker-compose exec frontend ping -c 3 backend
docker-compose exec backend ping -c 3 mysql
```

### 10.4 クリーンアップ

```bash
#!/bin/bash
# scripts/cleanup.sh

echo "Cleaning up Docker resources..."

# Stop all services
docker-compose down

# Remove volumes (注意: データが削除されます)
read -p "Remove volumes? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
fi

# Remove images
read -p "Remove images? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down --rmi all
fi

# Clean up dangling images
docker image prune -f

echo "Cleanup completed"
```

---

## 付録

### A. MySQL設定

MySQL 8.0 公式イメージを使用しており、基本的な設定は環境変数で行います。
カスタム設定が必要な場合は、設定ファイルをマウントできます。

```ini
# mysql/my.cnf

[mysqld]
# Character Set
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# Connection
max_connections=200
wait_timeout=600
interactive_timeout=600

# Performance
innodb_buffer_pool_size=256M
innodb_log_file_size=64M
innodb_flush_log_at_trx_commit=2

# Query Cache (disabled in MySQL 8.0)
# query_cache_type=0

# Logging
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

# Security
local_infile=0
skip_name_resolve=1

[client]
default-character-set=utf8mb4
```

```yaml
# docker-compose.yml でのマウント例
services:
  mysql:
    volumes:
      - mysql-data:/var/lib/mysql:rw
      - ./mysql/my.cnf:/etc/mysql/conf.d/custom.cnf:ro
```

### B. Makefile

```makefile
# Makefile for Claude Code Docker operations

.PHONY: help build up down restart logs clean test

help:
	@echo "Claude Code - Docker Operations"
	@echo "================================"
	@echo "make build       - Build all Docker images"
	@echo "make up          - Start all services"
	@echo "make down        - Stop all services"
	@echo "make restart     - Restart all services"
	@echo "make logs        - View logs"
	@echo "make clean       - Clean up resources"
	@echo "make test        - Run tests"

build:
	docker-compose build --parallel

up:
	docker-compose up -d
	@echo "Waiting for services..."
	@sleep 5
	@make status

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

status:
	docker-compose ps
	@curl -s http://localhost:8000/api/health | jq || echo "Backend not ready"

clean:
	docker-compose down -v --rmi local
	docker image prune -f

test:
	docker-compose run --rm backend poetry run pytest

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

mysql-cli:
	docker-compose exec mysql mysql -u claude -p claude_code

backup:
	./scripts/backup-volumes.sh

restore:
	./scripts/restore-volumes.sh
```

### C. CI/CD パイプライン例 (GitHub Actions)

```yaml
# .github/workflows/docker-build.yml
name: Docker Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build Backend Image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        target: production
        push: false
        tags: claude-backend:test
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Build Frontend Image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        target: production
        push: false
        tags: claude-frontend:test
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Run Trivy Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: claude-backend:test
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Start Services
      run: |
        docker-compose up -d
        sleep 10

    - name: Run Health Checks
      run: |
        curl -f http://localhost:8000/api/health || exit 1
        curl -f http://localhost:3000 || exit 1

    - name: Run Backend Tests
      run: |
        docker-compose exec -T backend poetry run pytest

    - name: Cleanup
      if: always()
      run: docker-compose down -v
```

---

## まとめ

この設計書では、Web版Claude CodeのDocker/インフラ構成を包括的に定義しました。

### 主要成果物

1. **docker-compose.yml** - 本番・開発環境対応の完全な設定
2. **Dockerfile** - マルチステージビルドによる最適化されたイメージ
3. **環境変数設計** - セキュアで柔軟な設定管理
4. **ボリューム設計** - データ永続化とバックアップ戦略
5. **ネットワーク設計** - セキュアなサービス間通信
6. **セキュリティ** - 非rootユーザー、シークレット管理、スキャン
7. **運用スクリプト** - 起動・停止・バックアップ・診断

### 次のステップ

1. 実装フェーズで各ファイルを実際に作成
2. CI/CDパイプライン構築
3. モニタリング・アラート設定
4. 本番環境デプロイ戦略策定
5. Kubernetes移行検討（必要に応じて）

---

## 11. Docker-in-Docker (DinD) 設計

### 11.1 DinD概要

Docker-in-Docker (DinD) は、Dockerコンテナ内で別のDockerデーモンを実行する技術です。本プロジェクトでは安全なコード実行環境として使用しています。

### 11.2 DinDアーキテクチャ

```mermaid
flowchart TB
    subgraph HostMachine["ホストマシン"]
        subgraph DockerNetwork["Docker Network (claude-network)"]
            Backend["Backend Container<br/>FastAPI + Agent SDK"]
            CodeServer["code-server Container<br/>VSCode Web"]

            subgraph DinDContainer["DinD Container (Privileged)"]
                DockerDaemon["Docker Daemon<br/>tcp://dind:2375"]
                UserContainer["ユーザーコンテナ<br/>(動的生成)"]
            end
        end

        WorkspaceVol[("workspace-data<br/>/workspaces")]
        DinDStorage[("dind-storage<br/>/var/lib/docker")]
    end

    Backend -->|tcp://dind:2375| DockerDaemon
    CodeServer -->|tcp://dind:2375| DockerDaemon
    Backend --> WorkspaceVol
    CodeServer --> WorkspaceVol
    DinDContainer --> WorkspaceVol
    DockerDaemon --> DinDStorage
    DockerDaemon --> UserContainer
```

### 11.3 DinDの利点

| 項目 | 説明 |
|------|------|
| 分離性 | ユーザーコードをホストから完全に分離 |
| セキュリティ | 悪意のあるコードがホストに影響しない |
| 再現性 | 一貫した実行環境を提供 |
| 共有 | BackendとVSCode Webで同じDocker環境を使用 |
| クリーンアップ | コンテナ終了時に自動的にリソース解放 |

### 11.4 docker-compose.dind.yml

```yaml
version: '3.8'

services:
  dind:
    image: docker:24-dind
    container_name: claude-dind
    privileged: true
    environment:
      - DOCKER_TLS_CERTDIR=  # TLS無効（内部通信のみ）
    volumes:
      - workspace-data:/workspaces:rw
      - dind-storage:/var/lib/docker:rw
    networks:
      - claude-network
    healthcheck:
      test: ["CMD", "docker", "info"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  backend:
    environment:
      - DOCKER_HOST=tcp://dind:2375
      - DIND_ENABLED=true
      - DIND_WORKSPACE_PATH=/workspaces
    depends_on:
      dind:
        condition: service_healthy

  code-server:
    environment:
      - DOCKER_HOST=tcp://dind:2375
    depends_on:
      dind:
        condition: service_healthy

volumes:
  dind-storage:
    driver: local
    name: claude-dind-storage
```

### 11.5 DinD Executor

バックエンドからDinDを使用してコードを実行するためのExecutorクラス：

| メソッド | 説明 |
|---------|------|
| `is_available()` | DinD環境が利用可能かチェック |
| `run_python_code(code)` | Pythonコードを実行 |
| `run_bash_command(command)` | Bashコマンドを実行 |
| `build_image(dockerfile, tag)` | Dockerイメージをビルド |
| `cleanup()` | 不要なコンテナ/イメージを削除 |

### 11.6 セキュリティ考慮事項

| 対策 | 説明 |
|------|------|
| Privilegedモード | DinDコンテナのみに限定 |
| ネットワーク分離 | 内部ネットワークでのみ通信 |
| TLS無効化 | 内部通信のためTLS不要（ホスト外からはアクセス不可） |
| リソース制限 | CPU/メモリ制限で暴走防止 |
| タイムアウト | 長時間実行を自動終了 |
| ボリューム分離 | ワークスペースのみ共有 |

### 11.7 DinD関連コマンド

| コマンド | 説明 |
|----------|------|
| `make dind-up` | DinDのみ起動 |
| `make dind-down` | DinD停止 |
| `make dind-test` | 接続テスト |
| `make dind-stats` | 統計表示 |
| `make dind-clean` | ストレージクリーンアップ |

### 11.8 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [DinD詳細設計書](dind-design.md) | DinDアーキテクチャ・セキュリティ設計 |
| [DinDセットアップガイド](dind-setup-guide.md) | 環境構築手順 |
| [DinD Executor使用ガイド](dind-executor-usage.md) | Executorの使い方 |
| [DinD実装サマリ](dind-implementation-summary.md) | 実装詳細 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-20 | 初版作成 |
| v1.1 | 2025-12-21 | Mermaid形式への統一、インフラ構成図のビジュアル化 |
| v1.2 | 2025-12-29 | DinDセクション追加、テーブル形式に統一、コンテナリビルドルール追加 |
| v1.3 | 2026-01-02 | RedisをMySQLに変更、目次の完全更新、パス修正（src/frontend, src/backend） |

---

**ドキュメント管理情報**

| 項目 | 値 |
|------|-----|
| 設計書バージョン | 1.3 |
| 最終更新 | 2026-01-02 |
| 作成者 | Claude Code |
| レビューステータス | 完了 |
| 完成度 | 100% |
