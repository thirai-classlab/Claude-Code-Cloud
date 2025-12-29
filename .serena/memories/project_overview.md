# Project Overview: AGENTSDK (Web版Claude Code)

## Purpose
Web版Claude Codeプロジェクト - Claude Agent SDK (Python) を使用したWebベースのコーディングアシスタント

## Main Features
- Claudeとのリアルタイムストリーミングチャット
- ファイル操作（Read/Write/Edit）
- Bashコマンド実行
- VSCode Web（code-server）統合
- プロジェクト・セッション管理
- メッセージ履歴保存
- Docker-in-Docker (DinD) によるコード実行環境

## Tech Stack

### Frontend
- React 18, Next.js 14
- TypeScript 5.4
- Monaco Editor
- TailwindCSS 3.4
- Zustand (状態管理)

### Backend
- Python 3.11
- FastAPI
- Claude Agent SDK (claude-agent-sdk ^0.1.18)
- SQLAlchemy 2.x (async)
- aiomysql
- Pydantic 2.x
- Uvicorn

### Database
- MySQL 8.0

### Infrastructure
- Docker 24+
- Docker Compose 2.x
- Docker-in-Docker (DinD)
- code-server (VSCode Web)

## Architecture
```
Browser → Frontend (Next.js :3000) → Backend (FastAPI :8000) → Claude API
                                         ↓
                                    MySQL :3306
                                         ↓
                                  code-server :8080
                                         ↓
                                    DinD :2375
```
