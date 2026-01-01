# Web版Claude Code プロジェクト設計書

**作成日:** 2025-12-20
**最終更新:** 2026-01-02
**バージョン:** 1.4
**ステータス:** ✅ 完了（100%）
**関連ドキュメント:** [データベース設計書](database-design.md), [バックエンド設計書](backend-design.md), [フロントエンド設計書](frontend-design.md)

---

## 目次

- [1. システム概要](#1-システム概要)
  - [1.1 プロジェクト目的](#11-プロジェクト目的)
  - [1.2 アーキテクチャ図](#12-アーキテクチャ図)
- [2. 技術スタック選定](#2-技術スタック選定)
  - [2.1 バックエンド](#21-バックエンド)
  - [2.2 フロントエンド](#22-フロントエンド)
  - [2.3 インフラ](#23-インフラ)
- [3. コンポーネント設計](#3-コンポーネント設計)
  - [3.1 バックエンドコンポーネント](#31-バックエンドコンポーネント)
  - [3.2 フロントエンドコンポーネント](#32-フロントエンドコンポーネント)
- [4. API設計](#4-api設計)
  - [4.1 REST API エンドポイント](#41-rest-api-エンドポイント)
  - [4.2 WebSocket API](#42-websocket-api)
- [5. データフロー](#5-データフロー)
  - [5.1 チャットメッセージフロー](#51-チャットメッセージフロー)
- [6. セキュリティ考慮事項](#6-セキュリティ考慮事項)
  - [6.1 セキュリティチェックリスト](#61-セキュリティチェックリスト)
  - [6.2 環境変数管理](#62-環境変数管理)
- [7. Docker構成](#7-docker構成)
  - [7.1 docker-compose.yml](#71-docker-composeyml)
- [8. 実装優先順位](#8-実装優先順位)
- [9. 重要ファイル一覧](#9-重要ファイル一覧)
- [変更履歴](#変更履歴)

---

## 1. システム概要

### 1.1 プロジェクト目的
WebブラウザからアクセスできるClaudeベースのコーディングアシスタントを構築します。Claude Agent SDK (Python) を使用し、ユーザーがコードの質問、生成、レビュー、デバッグなどをリアルタイムで行えるWebアプリケーションです。

### 1.2 アーキテクチャ図

```mermaid
flowchart TB
    subgraph Docker["Docker Environment"]
        subgraph Frontend["Frontend (React/Next.js)<br/>Port: 3000"]
            ChatUI["Chat UI"]
            CodeEditor["Code Editor"]
            FileTree["File Tree"]
            Templates["Template Manager"]
        end

        subgraph Backend["Backend (FastAPI)<br/>Port: 8000"]
            WebSocket["WebSocket Handler"]
            RestAPI["REST API Endpoints"]

            subgraph SDK["Claude Agent SDK (Python)"]
                Agent["Agent"]
                Tools["Tools"]
                Streaming["Streaming"]
            end

            MCP["MCP Servers<br/>(Dynamic Loading)"]
        end

        subgraph MySQL["MySQL<br/>Port: 3306"]
            DB["Users/Projects/Sessions<br/>Messages/Templates"]
        end

        subgraph CodeServer["code-server<br/>Port: 8080"]
            VSCode["VSCode Web IDE"]
        end

        subgraph DinD["Docker-in-Docker<br/>Port: 2375"]
            Sandbox["Sandbox Execution"]
        end

        subgraph Volume["Shared Volume"]
            Workspace["/workspace<br/>(User project files)"]
        end
    end

    subgraph External["External"]
        Anthropic["Anthropic API<br/>(Claude Models)"]
    end

    ChatUI <--> WebSocket
    CodeEditor <--> RestAPI
    FileTree <--> RestAPI
    Templates <--> RestAPI

    WebSocket <--> SDK
    RestAPI <--> SDK
    SDK --> MCP
    SDK --> Anthropic

    Backend --> MySQL
    Backend --> Volume
    Backend -.-> DinD
    CodeServer --> Volume
    DinD --> Volume
```

---

## 2. 技術スタック選定

### 2.1 バックエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| Python | 3.11+ | Claude Agent SDK公式サポート |
| FastAPI | 0.115+ | 非同期/WebSocket/自動ドキュメント |
| Claude Agent SDK | 最新 | Anthropic公式SDK |
| Uvicorn | 0.30+ | ASGIサーバー/WebSocket対応 |
| MySQL | 8.0+ | 永続データ/JSON型サポート |
| Pydantic | 2.x | データバリデーション |
| SQLAlchemy | 2.x | ORM/非同期対応 |

### 2.2 フロントエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| React | 18+ | コンポーネントベース/豊富なエコシステム |
| Next.js | 14+ | SSR対応/APIルート/開発効率 |
| TypeScript | 5.x | 型安全性 |
| Monaco Editor | 最新 | VS Codeと同じエディタ |
| TailwindCSS | 3.x | ユーティリティファーストCSS |
| Zustand | 最新 | 軽量状態管理 |

### 2.3 インフラ

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| Docker | 24+ | コンテナ化 |
| Docker Compose | 2.x | マルチコンテナ管理 |
| Docker-in-Docker | 24-dind | 分離されたコード実行環境 |
| code-server | 4.x | VSCode Web IDE |
| Nginx | 1.25+ | リバースプロキシ（オプション） |

---

## 3. コンポーネント設計

### 3.1 バックエンドコンポーネント

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI アプリケーションエントリポイント
│   ├── config.py                    # 環境設定
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # 認証API
│   │   │   ├── projects.py          # プロジェクト管理API
│   │   │   ├── sessions.py          # セッション管理API
│   │   │   ├── files.py             # ファイル操作API
│   │   │   ├── templates.py         # テンプレート管理API
│   │   │   ├── shares.py            # プロジェクト共有API
│   │   │   ├── project_config.py    # MCP/Agent/Skill/Command設定API
│   │   │   ├── health.py            # ヘルスチェック
│   │   │   └── code_server.py       # code-server連携API
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── handlers.py          # WebSocketハンドラー
│   ├── core/
│   │   ├── __init__.py
│   │   ├── claude_client.py         # Claude Agent SDK ラッパー
│   │   ├── session_manager.py       # セッション管理
│   │   └── security/
│   │       ├── auth.py              # 認証・認可
│   │       └── sandbox.py           # サンドボックス制御
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py              # SQLAlchemy モデル定義
│   │   ├── user.py                  # ユーザーモデル
│   │   ├── projects.py              # プロジェクトモデル
│   │   ├── sessions.py              # セッションモデル
│   │   ├── messages.py              # メッセージモデル
│   │   ├── project_share.py         # プロジェクト共有モデル
│   │   └── errors.py                # エラーモデル
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chat_service.py          # チャットビジネスロジック
│   │   ├── file_service.py          # ファイル操作ロジック
│   │   ├── project_service.py       # プロジェクトサービス
│   │   ├── template_service.py      # テンプレートサービス
│   │   └── project_config_service.py # 設定管理サービス
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py               # リクエストスキーマ
│   │   ├── response.py              # レスポンススキーマ
│   │   ├── project_config.py        # 設定スキーマ
│   │   └── template.py              # テンプレートスキーマ
│   └── utils/
│       ├── __init__.py
│       └── logger.py                # ロギング設定
├── migrations/                       # Alembicマイグレーション
├── pyproject.toml
├── Dockerfile
└── .env.example
```

> 詳細なテーブル設計は[データベース設計書](database-design.md)を参照してください。

### 3.2 フロントエンドコンポーネント

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # ルートレイアウト
│   │   ├── page.tsx                 # ホームページ
│   │   ├── globals.css
│   │   ├── projects/[id]/page.tsx   # プロジェクト詳細
│   │   ├── login/page.tsx           # ログインページ
│   │   └── register/page.tsx        # 登録ページ
│   ├── components/
│   │   ├── atoms/                   # Atomic Design: 最小単位
│   │   │   ├── Button.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Indicator.tsx
│   │   ├── molecules/               # Atomic Design: 組み合わせ
│   │   │   ├── NavItem.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── MessageHeader.tsx
│   │   ├── organisms/               # Atomic Design: 機能単位
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Message.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── templates/               # ページレイアウト
│   │   │   └── MainLayout.tsx
│   │   ├── chat/                    # チャット関連
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── project/                 # プロジェクト関連
│   │   │   ├── ProjectList.tsx
│   │   │   ├── CreateProjectModal.tsx
│   │   │   └── ProjectHeader.tsx
│   │   ├── template/                # テンプレート関連
│   │   │   ├── TemplateSection.tsx
│   │   │   └── TemplateFormModal.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Loading.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts          # WebSocket接続管理
│   │   ├── useChat.ts               # チャット状態管理
│   │   ├── useProjects.ts           # プロジェクト管理
│   │   └── useFiles.ts              # ファイル状態管理
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts            # APIクライアント
│   │   │   ├── projects.ts          # プロジェクトAPI
│   │   │   ├── templates.ts         # テンプレートAPI
│   │   │   └── auth.ts              # 認証API
│   │   └── websocket.ts             # WebSocketクライアント
│   ├── stores/
│   │   ├── chatStore.ts             # チャット状態
│   │   ├── projectStore.ts          # プロジェクト状態
│   │   ├── sessionStore.ts          # セッション状態
│   │   └── uiStore.ts               # UI状態
│   └── types/
│       ├── message.ts
│       ├── project.ts
│       ├── session.ts
│       └── template.ts
├── package.json
├── Dockerfile
└── next.config.js
```

> 詳細なコンポーネント設計は[フロントエンド設計書](frontend-design.md)を参照してください。

---

## 4. API設計

### 4.1 REST API エンドポイント

#### 4.1.1 認証

```mermaid
flowchart LR
    subgraph 認証API
        A1[POST /api/auth/register] --> A1D[ユーザー登録]
        A2[POST /api/auth/login] --> A2D[ログイン]
        A3[POST /api/auth/logout] --> A3D[ログアウト]
        A4[GET /api/auth/me] --> A4D[現在のユーザー取得]
    end
```

#### 4.1.2 プロジェクト管理

```mermaid
flowchart LR
    subgraph プロジェクトAPI
        P1[GET /api/projects] --> P1D[プロジェクト一覧]
        P2[POST /api/projects] --> P2D[プロジェクト作成]
        P3[GET /api/projects/id] --> P3D[プロジェクト詳細]
        P4[PUT /api/projects/id] --> P4D[プロジェクト更新]
        P5[DELETE /api/projects/id] --> P5D[プロジェクト削除]
    end
```

#### 4.1.3 セッション管理

```mermaid
flowchart LR
    subgraph セッションAPI
        S1[GET /api/projects/id/sessions] --> S1D[セッション一覧]
        S2[POST /api/projects/id/sessions] --> S2D[セッション作成]
        S3[GET /api/sessions/id] --> S3D[セッション詳細]
        S4[DELETE /api/sessions/id] --> S4D[セッション削除]
        S5[GET /api/sessions/id/messages] --> S5D[メッセージ履歴]
    end
```

#### 4.1.4 テンプレート管理

```mermaid
flowchart LR
    subgraph テンプレートAPI
        T1[GET /api/templates] --> T1D[テンプレート一覧]
        T2[POST /api/templates] --> T2D[テンプレート作成]
        T3[GET /api/templates/id] --> T3D[テンプレート詳細]
        T4[PUT /api/templates/id] --> T4D[テンプレート更新]
        T5[DELETE /api/templates/id] --> T5D[テンプレート削除]
        T6[POST /api/templates/id/apply] --> T6D[テンプレート適用]
    end
```

#### 4.1.5 プロジェクト設定

```mermaid
flowchart LR
    subgraph 設定API
        C1[GET /api/projects/id/mcp-servers] --> C1D[MCPサーバー一覧]
        C2[POST /api/projects/id/mcp-servers] --> C2D[MCPサーバー追加]
        C3[GET /api/projects/id/agents] --> C3D[エージェント一覧]
        C4[POST /api/projects/id/agents] --> C4D[エージェント追加]
        C5[GET /api/projects/id/skills] --> C5D[スキル一覧]
        C6[GET /api/projects/id/commands] --> C6D[コマンド一覧]
    end
```

#### 4.1.6 ファイル操作

```mermaid
flowchart LR
    subgraph ファイルAPI
        F1[GET /api/files] --> F1D[ファイル一覧取得]
        F2[GET /api/files/path] --> F2D[ファイル内容取得]
        F3[POST /api/files/path] --> F3D[ファイル作成]
        F4[PUT /api/files/path] --> F4D[ファイル更新]
        F5[DELETE /api/files/path] --> F5D[ファイル削除]
    end
```

#### 4.1.7 システム

```mermaid
flowchart LR
    subgraph システムAPI
        H1[GET /api/health] --> H1D[ヘルスチェック]
        H2[GET /api/config] --> H2D[クライアント設定取得]
    end
```

### 4.2 WebSocket API

#### 4.2.1 接続

```
ws://localhost:8000/ws/chat/{session_id}
```

#### 4.2.2 メッセージフォーマット

**クライアント -> サーバー:**

```json
// チャットメッセージ送信
{
  "type": "chat",
  "content": "Pythonでフィボナッチ数列を計算する関数を書いてください"
}

// 処理中断
{
  "type": "interrupt"
}

// ファイル添付
{
  "type": "chat",
  "content": "このコードをレビューしてください",
  "files": [
    {"path": "main.py", "content": "..."}
  ]
}
```

**サーバー -> クライアント:**

```json
// テキストレスポンス (ストリーミング)
{
  "type": "text",
  "content": "フィボナッチ数列を計算する..."
}

// ツール使用通知
{
  "type": "tool_use",
  "tool": "Write",
  "input": {"path": "fibonacci.py", "content": "..."}
}

// ツール結果
{
  "type": "tool_result",
  "tool_use_id": "xxx",
  "success": true,
  "output": "ファイルを作成しました"
}

// 完了通知
{
  "type": "result",
  "cost": 0.0123,
  "usage": {
    "input_tokens": 500,
    "output_tokens": 1200
  }
}

// エラー
{
  "type": "error",
  "message": "エラーが発生しました"
}
```

---

## 5. データフロー

### 5.1 チャットメッセージフロー

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend<br/>(React)
    participant Backend as Backend<br/>(FastAPI)
    participant Claude as Claude API

    User->>Frontend: 1. メッセージ入力
    Frontend->>Backend: 2. WebSocket送信
    Backend->>Claude: 3. Agent実行

    Claude-->>Backend: 4. Streaming Response
    Backend-->>Frontend: 5. Stream転送
    Frontend-->>User: 6. リアルタイム表示更新

    Note over Backend: 7. ツール実行<br/>(Read/Write/Bash)
    Backend->>Backend: ツール処理

    Backend-->>Frontend: 8. ツール結果通知
    Frontend-->>User: 9. 表示更新
```

---

## 6. セキュリティ考慮事項

### 6.1 セキュリティチェックリスト

```mermaid
flowchart TD
    subgraph セキュリティ対策
        SEC1[API Key保護] --> SEC1D[環境変数管理/クライアント非露出]
        SEC2[入力検証] --> SEC2D[Pydanticバリデーション]
        SEC3[ファイルアクセス制限] --> SEC3D[workspace外アクセス禁止]
        SEC4[コマンド実行制限] --> SEC4D[危険コマンドブロックリスト]
        SEC5[レート制限] --> SEC5D[FastAPI middleware実装]
        SEC6[CORS設定] --> SEC6D[許可オリジン制限]
        SEC7[WebSocket認証] --> SEC7D[セッショントークン認証]
    end
```

### 6.2 環境変数管理

```env
# .env.example
ANTHROPIC_API_KEY=sk-ant-xxx
DATABASE_URL=mysql+aiomysql://user:pass@mysql:3306/claude_code
WORKSPACE_PATH=/app/workspace
MAX_SESSIONS=100
SESSION_TIMEOUT=3600
ALLOWED_ORIGINS=http://localhost:3000
DEBUG=false
```

---

## 7. Docker構成

### 7.1 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
      - NEXT_PUBLIC_CODE_SERVER_URL=http://localhost:8080
    depends_on:
      - backend
    networks:
      - claude-network

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=mysql+aiomysql://user:pass@mysql:3306/claude_code
      - WORKSPACE_PATH=/workspace
      - ALLOWED_ORIGINS=http://localhost:3000
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - workspace-data:/workspace
    networks:
      - claude-network

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=claude_code
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - claude-network

  code-server:
    image: codercom/code-server:latest
    ports:
      - "8080:8080"
    environment:
      - PASSWORD=${CODE_SERVER_PASSWORD:-password}
    volumes:
      - workspace-data:/workspace
    networks:
      - claude-network

  dind:
    image: docker:24-dind
    privileged: true
    ports:
      - "2375:2375"
    environment:
      - DOCKER_TLS_CERTDIR=
    volumes:
      - workspace-data:/workspace
      - dind-storage:/var/lib/docker
    networks:
      - claude-network

volumes:
  workspace-data:
  mysql-data:
  dind-storage:

networks:
  claude-network:
    driver: bridge
```

> 詳細なDocker構成は[Docker設計書](docker-design.md)と[DinDセットアップガイド](dind-setup-guide.md)を参照してください。

---

## 8. 実装優先順位

| フェーズ | 優先度 | 機能 | 説明 |
|---------|-------|------|------|
| Phase 1: MVP | 1 | FastAPI基本セットアップ | APIサーバー構築 |
| | 2 | Claude Agent SDK 統合 | SDK連携実装 |
| | 3 | WebSocket基本実装 | リアルタイム通信 |
| | 4 | シンプルなReactチャットUI | 基本UI構築 |
| | 5 | Docker環境構築 | コンテナ化 |
| Phase 2: コア機能 | 1 | セッション管理 | MySQL永続化 |
| | 2 | ファイル操作API | CRUD実装 |
| | 3 | Monaco Editorの統合 | コードエディタ |
| | 4 | ツール使用の可視化 | UI表示改善 |
| | 5 | エラーハンドリング強化 | 堅牢性向上 |
| Phase 3: 拡張機能 | 1 | 認証・認可 | ユーザー管理 |
| | 2 | チャット履歴保存 | 永続化 |
| | 3 | カスタムMCPツール | 拡張性 |
| | 4 | レート制限 | セキュリティ |
| | 5 | モニタリング・ログ | 運用性向上 |

---

## 9. 重要ファイル一覧

| ファイル | 説明 |
|---------|------|
| `claude_client.py` | Claude Agent SDKラッパークラス |
| `handlers.py` | WebSocketハンドラー |
| `main.py` | FastAPIエントリポイント |
| `useWebSocket.ts` | WebSocket接続管理フック |
| `docker-compose.yml` | Docker構成ファイル |
| `database.py` | SQLAlchemyモデル定義 |
| `project_config_service.py` | MCP/Agent/Skill設定管理 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-20 | 初版作成 |
| v1.1 | 2025-12-21 | Mermaid図形式統一、ドキュメント完成度100%達成 |
| v1.2 | 2025-12-29 | MySQL/DinD/code-server追加、テンプレート/共有機能追加、API設計更新 |
| v1.3 | 2025-12-29 | テーブル形式に統一（技術スタック、実装優先順位、重要ファイル） |
| v1.4 | 2026-01-02 | 目次追加、Redis記述をMySQLに統一 |

---

**ドキュメント管理情報**

| 項目 | 値 |
|------|-----|
| 設計書バージョン | 1.4 |
| 最終更新 | 2026-01-02 |
| 作成者 | Claude Code |
| レビューステータス | ✅ 完了 |
| 完成度 | 100% |
