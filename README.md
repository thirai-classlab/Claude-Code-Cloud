# Web版Claude Code

Claude Agent SDK (Python) を使用したWebベースのコーディングアシスタント

## 概要

このプロジェクトは、ブラウザからアクセスできるClaudeベースのコーディングアシスタントです。React/Next.jsフロントエンドとFastAPIバックエンドを組み合わせ、リアルタイムでコードの質問、生成、レビュー、デバッグが可能です。

### 主な機能

| 機能 | 説明 |
|------|------|
| リアルタイムストリーミングチャット | Claudeとのリアルタイム会話、中断・再開対応 |
| ファイル操作 | Read/Write/Edit ツール統合 |
| Bashコマンド実行 | コンテナ内でのコマンド実行 |
| VSCode Web統合 | code-server によるブラウザベースエディタ |
| プロジェクト・セッション管理 | マルチプロジェクト、セッション履歴保存 |
| シンタックスハイライト | prism-react-renderer によるコードブロック表示 |
| セッション永続化 | ローカルストレージキャッシュ、ドラフト保存 |
| MCP サーバー統合 | Model Context Protocol サーバー連携 |
| カスタムエージェント | プロジェクト固有のエージェント設定 |
| WebSocket 接続管理 | ping/pong、状態追跡、自動再接続 |

# エージェントの動作
こちらからの全て指示は『/sc:pm』を適応し最適なサブエージェントと連携して作業を行う

## システム要件

- Docker 24.0+
- Docker Compose 2.x
- 8GB以上のメモリ推奨
- Anthropic API Key

## クイックスタート

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd AGENTSDK
```

### 2. 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集して必須変数を設定
# 必須:
# - ANTHROPIC_API_KEY: Claude APIキー
# - SECRET_KEY: セキュリティキー (openssl rand -hex 32で生成)
```

### 3. サービスの起動

#### 標準構成

```bash
# Makefileを使用
make up

# または直接docker-composeを使用
docker-compose up -d
```

#### DinD環境付き（コード実行環境が必要な場合）

```bash
# DinD環境を含めて起動
docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d

# .envでDinDを有効化
DIND_ENABLED=true
```

DinD (Docker-in-Docker) を使用すると、Backend (Agent SDK) とcode-serverで共有の安全なコード実行環境を利用できます。詳細は [DinD Setup Guide](doc/dind-setup-guide.md) を参照してください。

### 4. アクセス

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- code-server (VSCode Web): http://localhost:8080

## 開発環境

### 開発モードで起動

```bash
# 開発モード（ホットリロード有効）
make dev

# または
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### ログの確認

```bash
# 全サービスのログ
make logs

# バックエンドのみ
make logs-backend

# フロントエンドのみ
make logs-frontend
```

### コンテナ内でシェルを開く

```bash
# バックエンド
make shell-backend

# フロントエンド
make shell-frontend
```

## アーキテクチャ

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
│   Port: 3000    │
└────────┬────────┘
         │
         ↓ WebSocket/HTTP
┌─────────────────┐      ┌──────────────┐
│   Backend       │◄────►│    Redis     │
│  (FastAPI)      │      │ Port: 6379   │
│   Port: 8000    │      └──────────────┘
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Claude API     │
│  (Anthropic)    │
└─────────────────┘
```

## サービス構成

### 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | React 18, Next.js 14, TypeScript, TailwindCSS, Zustand, prism-react-renderer |
| Backend | Python 3.11, FastAPI, Claude Agent SDK, Uvicorn, SQLAlchemy 2.x, Pydantic 2.x |
| Database | MySQL 8.0 (永続化) |
| Cache | Redis (セッション・キャッシュ) |
| Infrastructure | Docker 24+, Docker Compose 2.x, Docker-in-Docker |
| IDE | code-server (VSCode Web) |

### サービス詳細

| サービス | 説明 |
|----------|------|
| Frontend (Next.js) | React 18 + Next.js 14、TypeScript、TailwindCSS、WebSocket通信 |
| Backend (FastAPI) | Python 3.11、Claude Agent SDK統合、WebSocket/REST API |
| MySQL | メッセージ履歴、プロジェクト設定、ユーザー情報の永続化 |
| Redis | セッション管理、キャッシュストア（AOF + RDB永続化） |
| code-server | ブラウザベースのVSCode、共有ワークスペース |
| Docker-in-Docker | 分離されたコード実行環境、安全なコンテナ実行 |

## 環境変数

主要な環境変数:

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| ANTHROPIC_API_KEY | Claude APIキー | 必須 |
| SECRET_KEY | セキュリティキー (32文字以上) | 必須 |
| FRONTEND_PORT | フロントエンドポート | 3000 |
| BACKEND_PORT | バックエンドポート | 8000 |
| BUILD_TARGET | ビルドターゲット | production |
| DEBUG | デバッグモード | false |

完全なリストは `.env.example` を参照してください。

## Makefileコマンド

```bash
make help          # ヘルプ表示
make build         # イメージビルド
make up            # サービス起動
make down          # サービス停止
make restart       # サービス再起動
make logs          # ログ表示
make dev           # 開発モードで起動
make clean         # リソース削除
make test          # テスト実行
make status        # サービス状態確認
```

## トラブルシューティング

### サービスが起動しない

```bash
# ログを確認
docker-compose logs backend

# 環境変数を確認
cat .env
```

### Redisに接続できない

```bash
# Redisの状態確認
docker-compose exec redis redis-cli ping

# Redisログ確認
docker-compose logs redis
```

### ポート競合

.envファイルでポートを変更:
```
FRONTEND_PORT=3001
BACKEND_PORT=8001
```

### ワークスペースのパーミッションエラー

```bash
# ワークスペースの所有者を変更
sudo chown -R 1000:1000 ./workspace
```

## セキュリティ考慮事項

- 全サービスが非rootユーザーで実行
- 環境変数でAPIキー管理（Git管理外）
- CORS設定でオリジン制限
- レート制限実装
- ワークスペース外のファイルアクセス制限

## 本番環境デプロイ

本番環境では以下の設定を推奨:

1. 環境変数の設定
```bash
BUILD_TARGET=production
DEBUG=false
LOG_LEVEL=warning
```

2. リバースプロキシ (Nginx) の使用
3. HTTPS/TLS証明書の設定
4. Docker Secretsでシークレット管理
5. 定期的なバックアップ

## ライセンス

MIT License

## サポート

問題が発生した場合:
1. ログを確認: `make logs`
2. サービス状態確認: `make status`
3. Issueを作成

## ドキュメント

本プロジェクトには包括的な技術ドキュメントが用意されています。

---

### 目次

1. [システム設計](#システム設計)
2. [UI/UX設計](#uiux設計)
3. [Docker-in-Docker (DinD)](#docker-in-docker-dind)
4. [ガイド](#ガイド)
5. [その他](#その他)
6. [外部リソース](#外部リソース)

---

### システム設計

| ドキュメント | 説明 | パス |
|-------------|------|------|
| アーキテクチャ設計書 | システム全体の設計、技術スタック、コンポーネント構成 | [doc/architecture-design.md](doc/architecture-design.md) |
| バックエンド設計書 | FastAPI、API設計、WebSocket、エラーハンドリング | [doc/backend-design.md](doc/backend-design.md) |
| フロントエンド設計書 | React/Next.js、コンポーネント設計、状態管理 | [doc/frontend-design.md](doc/frontend-design.md) |
| データベース設計書 | ER図、テーブル定義、インデックス、マイグレーション | [doc/database-design.md](doc/database-design.md) |
| Docker設計書 | コンテナ構成、ネットワーク、ボリューム | [doc/docker-design.md](doc/docker-design.md) |
| 認証設計書 | 認証・認可の設計、JWT、権限管理 | [doc/authentication-design.md](doc/authentication-design.md) |
| 概要設計書 | プロジェクト概要、機能一覧 | [doc/overview-design.md](doc/overview-design.md) |

### UI/UX設計

| ドキュメント | 説明 | パス |
|-------------|------|------|
| 画面設計書 | 画面レイアウト、コンポーネント配置 | [doc/screen-design.md](doc/screen-design.md) |
| デザインシステム | カラー、タイポグラフィ、スペーシング | [doc/frontend-design-system.md](doc/frontend-design-system.md) |
| コンポーネント設計書 | Atomic Design、コンポーネント仕様 | [doc/frontend-component-design.md](doc/frontend-component-design.md) |
| Tailwind CSS設定 | Tailwind設定、CSS変数、テーマ | [doc/tailwind-config-design.md](doc/tailwind-config-design.md) |

### Docker-in-Docker (DinD)

| ドキュメント | 説明 | パス |
|-------------|------|------|
| DinD詳細設計書 | DinDアーキテクチャ・セキュリティ設計 | [doc/dind-design.md](doc/dind-design.md) |
| DinDセットアップガイド | DinD環境構築手順 | [doc/dind-setup-guide.md](doc/dind-setup-guide.md) |
| DinD Executor使用ガイド | コード実行環境の使い方 | [doc/dind-executor-usage.md](doc/dind-executor-usage.md) |
| DinD実装概要 | DinD実装詳細、変更履歴 | [doc/dind-implementation-summary.md](doc/dind-implementation-summary.md) |
| DinD変更概要 | DinD関連の変更内容 | [doc/dind-changes-summary.md](doc/dind-changes-summary.md) |

### ガイド

| ドキュメント | 説明 | パス |
|-------------|------|------|
| ユーザーガイド | エンドユーザー向け操作説明 | [doc/user-guide.md](doc/user-guide.md) |
| デプロイガイド | 本番環境へのデプロイ手順 | [doc/deployment-guide.md](doc/deployment-guide.md) |
| ユーザー操作 | ユーザー操作一覧 | [doc/user-operations.md](doc/user-operations.md) |

### その他

| ドキュメント | 説明 | パス |
|-------------|------|------|
| Claude Agent SDK調査 | SDK調査結果 | [doc/claude-agent-sdk-research.md](doc/claude-agent-sdk-research.md) |
| WebSocket統合 | WebSocket実装詳細 | [doc/frontend-websocket-integration.md](doc/frontend-websocket-integration.md) |
| 開発ロードマップ | 開発計画 | [doc/development-roadmap.md](doc/development-roadmap.md) |
| 実装進捗 | 実装状況 | [doc/implementation-progress.md](doc/implementation-progress.md) |
| Phase2実装概要 | Phase2の実装内容 | [doc/phase2-implementation-summary.md](doc/phase2-implementation-summary.md) |
| リファクタリング計画 | 2025年1月のリファクタリング | [doc/refactoring-2025-01.md](doc/refactoring-2025-01.md) |
| 次のタスク | 次に実装するタスク | [doc/next-tasks.md](doc/next-tasks.md) |

### 外部リソース

| リソース | URL |
|----------|-----|
| Claude Agent SDK | https://github.com/anthropics/anthropic-sdk-python |
| FastAPI ドキュメント | https://fastapi.tiangolo.com/ |
| Next.js ドキュメント | https://nextjs.org/docs |
| SQLAlchemy ドキュメント | https://docs.sqlalchemy.org/ |
| Zustand ドキュメント | https://zustand-demo.pmnd.rs/ |
