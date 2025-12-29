# Web版Claude Code

Claude Agent SDK (Python) を使用したWebベースのコーディングアシスタント

## 概要

このプロジェクトは、ブラウザからアクセスできるClaudeベースのコーディングアシスタントです。React/Next.jsフロントエンドとFastAPIバックエンドを組み合わせ、リアルタイムでコードの質問、生成、レビュー、デバッグが可能です。

### 主な機能

- Claudeとのリアルタイムストリーミングチャット
- ファイル操作（Read/Write/Edit）
- Bashコマンド実行
- VSCode Web（code-server）統合
- プロジェクト・セッション管理
- メッセージ履歴保存
- ツール実行の可視化

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

### Frontend (Next.js)
- React 18 + Next.js 14
- TypeScript
- Monaco Editor (VSCode同等のエディタ)
- TailwindCSS
- WebSocket接続でリアルタイム通信

### Backend (FastAPI)
- Python 3.11
- FastAPI + Uvicorn
- Claude Agent SDK統合
- WebSocketサポート
- Redis セッション管理

### Redis
- セッション・キャッシュストア
- 永続化設定済み (AOF + RDB)

### code-server (オプション)
- ブラウザベースのVSCode
- 共有ワークスペース

### Docker-in-Docker (DinD) (オプション)
- 分離されたコード実行環境
- Backend (Agent SDK) とcode-serverで共有
- 安全なコンテナ実行

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

### 📐 設計書

| ドキュメント | 説明 | 状態 |
|-------------|------|------|
| [アーキテクチャ設計書](doc/architecture-design.md) | システム全体の設計、技術スタック、コンポーネント構成 | ✅ 完了 |
| [バックエンド設計書](doc/backend-design.md) | FastAPI、API設計、WebSocket、エラーハンドリング | ✅ 完了 |
| [フロントエンド設計書](doc/frontend-design.md) | React/Next.js、コンポーネント設計、状態管理 | ✅ 完了 |
| [データベース設計書](doc/database-design.md) | ER図、テーブル定義、インデックス、マイグレーション | ✅ 完了 |
| [Docker設計書](doc/docker-design.md) | コンテナ構成、ネットワーク、ボリューム | ✅ 完了 |

### 🎨 UI/UX設計

| ドキュメント | 説明 | 状態 |
|-------------|------|------|
| [画面設計書](doc/screen-design.md) | 画面レイアウト、コンポーネント配置 | ✅ 完了 |
| [デザインシステム](doc/frontend-design-system.md) | カラー、タイポグラフィ、スペーシング | ✅ 完了 |
| [コンポーネント設計書](doc/frontend-component-design.md) | Atomic Design、コンポーネント仕様 | ✅ 完了 |
| [Tailwind CSS設定](doc/tailwind-config-design.md) | Tailwind設定、CSS変数 | ✅ 完了 |

### 🐳 Docker-in-Docker (DinD)

| ドキュメント | 説明 | 状態 |
|-------------|------|------|
| [DinD セットアップガイド](doc/dind-setup-guide.md) | DinD環境構築手順 | ✅ 完了 |
| [DinD Executor使用ガイド](doc/dind-executor-usage.md) | コード実行環境の使い方 | ✅ 完了 |
| [DinD 実装概要](doc/dind-implementation-summary.md) | DinD実装詳細、変更履歴 | ✅ 完了 |
| [DinD 変更概要](doc/dind-changes-summary.md) | DinD関連の変更内容 | ✅ 完了 |

### 📖 ガイド

| ドキュメント | 説明 | 状態 |
|-------------|------|------|
| [ユーザーガイド](doc/user-guide.md) | エンドユーザー向け操作説明 | ✅ 完了 |
| [デプロイガイド](doc/deployment-guide.md) | 本番環境へのデプロイ手順 | ✅ 完了 |
| [認証設計書](doc/authentication-design.md) | 認証・認可の設計 | ✅ 完了 |

### 📝 その他

| ドキュメント | 説明 | 状態 |
|-------------|------|------|
| [概要設計書](doc/overview-design.md) | プロジェクト概要 | ✅ 完了 |
| [Claude Agent SDK調査](doc/claude-agent-sdk-research.md) | SDK調査結果 | ✅ 完了 |
| [WebSocket統合](doc/frontend-websocket-integration.md) | WebSocket実装詳細 | ✅ 完了 |
| [ユーザー操作](doc/user-operations.md) | ユーザー操作一覧 | ✅ 完了 |
| [開発ロードマップ](doc/development-roadmap.md) | 開発計画 | ✅ 完了 |
| [実装進捗](doc/implementation-progress.md) | 実装状況 | ✅ 完了 |
| [Phase2実装概要](doc/phase2-implementation-summary.md) | Phase2の実装内容 | ✅ 完了 |
| [リファクタリング計画](doc/refactoring-2025-01.md) | 2025年1月のリファクタリング | 📋 計画中 |
| [次のタスク](doc/next-tasks.md) | 次に実装するタスク | 🔄 更新中 |

### 外部リソース
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-python)
- [FastAPI ドキュメント](https://fastapi.tiangolo.com/)
- [Next.js ドキュメント](https://nextjs.org/docs)
