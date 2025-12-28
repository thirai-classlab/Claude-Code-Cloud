# Web版Claude Code プロジェクト設計書

**作成日:** 2025-12-20
**最終更新:** 2025-12-21
**バージョン:** 1.1
**ステータス:** ✅ 完了（100%）

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
        end

        subgraph Backend["Backend (FastAPI)<br/>Port: 8000"]
            WebSocket["WebSocket Handler"]
            RestAPI["REST API Endpoints"]

            subgraph SDK["Claude Agent SDK (Python)"]
                Agent["Agent"]
                Tools["Tools"]
                Streaming["Streaming"]
            end

            MCP["MCP Servers<br/>(Optional)"]
        end

        subgraph Redis["Redis<br/>Port: 6379"]
            Session["Session/Cache"]
        end

        subgraph Volume["Shared Volume"]
            Workspace["/app/workspace<br/>(User project files)"]
        end
    end

    subgraph External["External"]
        Anthropic["Anthropic API<br/>(Claude Models)"]
    end

    ChatUI <--> WebSocket
    CodeEditor <--> RestAPI
    FileTree <--> RestAPI

    WebSocket <--> SDK
    RestAPI <--> SDK
    SDK --> MCP
    SDK --> Anthropic

    Backend --> Redis
    Backend --> Volume
```

---

## 2. 技術スタック選定

### 2.1 バックエンド

```mermaid
flowchart LR
    subgraph バックエンド技術スタック
        P[Python 3.11+] --> PD[Claude Agent SDK公式サポート]
        F[FastAPI 0.115+] --> FD[非同期/WebSocket/自動ドキュメント]
        C[Claude Agent SDK] --> CD[Anthropic公式SDK]
        U[Uvicorn 0.30+] --> UD[ASGIサーバー/WebSocket対応]
        R[Redis 7.x] --> RD[セッション管理/キャッシュ]
        PY[Pydantic 2.x] --> PYD[データバリデーション]
    end
```

### 2.2 フロントエンド

```mermaid
flowchart LR
    subgraph フロントエンド技術スタック
        RE[React 18+] --> RED[コンポーネントベース/豊富なエコシステム]
        NE[Next.js 14+] --> NED[SSR対応/APIルート/開発効率]
        TS[TypeScript 5.x] --> TSD[型安全性]
        MO[Monaco Editor] --> MOD[VS Codeと同じエディタ]
        TW[TailwindCSS 3.x] --> TWD[ユーティリティファーストCSS]
    end
```

### 2.3 インフラ

```mermaid
flowchart LR
    subgraph インフラ技術スタック
        DO[Docker 24+] --> DOD[コンテナ化]
        DC[Docker Compose 2.x] --> DCD[マルチコンテナ管理]
        NG[Nginx 1.25+] --> NGD[リバースプロキシ オプション]
    end
```

---

## 3. コンポーネント設計

### 3.1 バックエンドコンポーネント

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI アプリケーションエントリポイント
│   ├── config.py               # 環境設定
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py         # チャット関連エンドポイント
│   │   │   ├── files.py        # ファイル操作エンドポイント
│   │   │   ├── sessions.py     # セッション管理
│   │   │   └── health.py       # ヘルスチェック
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── handlers.py     # WebSocketハンドラー
│   ├── core/
│   │   ├── __init__.py
│   │   ├── claude_client.py    # Claude Agent SDK ラッパー
│   │   ├── session_manager.py  # セッション管理
│   │   └── tools.py            # カスタムツール定義
│   ├── models/
│   │   ├── __init__.py
│   │   ├── messages.py         # メッセージモデル
│   │   └── sessions.py         # セッションモデル
│   └── services/
│       ├── __init__.py
│       ├── chat_service.py     # チャットビジネスロジック
│       └── file_service.py     # ファイル操作ロジック
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 3.2 フロントエンドコンポーネント

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # メインページ
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx  # Monaco Editor ラッパー
│   │   │   └── FileTree.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainLayout.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Loading.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts     # WebSocket接続管理
│   │   ├── useChat.ts          # チャット状態管理
│   │   └── useFiles.ts         # ファイル状態管理
│   ├── lib/
│   │   ├── api.ts              # API クライアント
│   │   └── websocket.ts        # WebSocket クライアント
│   ├── stores/
│   │   ├── chatStore.ts        # Zustand ストア
│   │   └── fileStore.ts
│   └── types/
│       ├── message.ts
│       └── session.ts
├── package.json
├── Dockerfile
└── next.config.js
```

---

## 4. API設計

### 4.1 REST API エンドポイント

#### 4.1.1 セッション管理

```mermaid
flowchart LR
    subgraph セッションAPI
        S1[POST /api/sessions] --> S1D[新規セッション作成]
        S2[GET /api/sessions/id] --> S2D[セッション情報取得]
        S3[DELETE /api/sessions/id] --> S3D[セッション削除]
        S4[GET /api/sessions/id/history] --> S4D[チャット履歴取得]
    end
```

#### 4.1.2 ファイル操作

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

#### 4.1.3 システム

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
REDIS_URL=redis://redis:6379
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
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    depends_on:
      - backend
    networks:
      - claude-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - WORKSPACE_PATH=/app/workspace
      - ALLOWED_ORIGINS=http://localhost:3000
    depends_on:
      - redis
    volumes:
      - workspace-data:/app/workspace
    networks:
      - claude-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - claude-network

volumes:
  workspace-data:
  redis-data:

networks:
  claude-network:
    driver: bridge
```

---

## 8. 実装優先順位

### Phase 1: MVP
1. FastAPI基本セットアップ
2. Claude Agent SDK 統合
3. WebSocket基本実装
4. シンプルなReactチャットUI
5. Docker環境構築

### Phase 2: コア機能
1. セッション管理 (Redis)
2. ファイル操作API
3. Monaco Editorの統合
4. ツール使用の可視化
5. エラーハンドリング強化

### Phase 3: 拡張機能
1. 認証・認可
2. チャット履歴保存
3. カスタムMCPツール
4. レート制限
5. モニタリング・ログ

---

## 9. 重要ファイル一覧

```mermaid
flowchart LR
    subgraph 重要ファイル
        F1[claude_client.py] --> F1D[Claude Agent SDKラッパークラス]
        F2[handlers.py] --> F2D[WebSocketハンドラー]
        F3[main.py] --> F3D[FastAPIエントリポイント]
        F4[useWebSocket.ts] --> F4D[WebSocket接続管理フック]
        F5[docker-compose.yml] --> F5D[Docker構成ファイル]
    end
```

---

## 変更履歴

```mermaid
flowchart LR
    subgraph 変更履歴
        V10["v1.0<br/>2025-12-20<br/>初版作成"]
        V11["v1.1<br/>2025-12-21<br/>Mermaid図形式統一<br/>ドキュメント完成度100%達成"]
    end
    V10 --> V11
```

---

**ドキュメント管理情報**

```mermaid
classDiagram
    class ドキュメント情報 {
        設計書バージョン: 1.1
        最終更新: 2025-12-21
        作成者: Claude Code
        レビューステータス: ✅ 完了
        完成度: 100%
    }
```
