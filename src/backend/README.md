# Claude Code Backend

Web版Claude Code のバックエンドアプリケーション - FastAPI + Claude Agent SDK (Python)

## 技術スタック

- **Python**: 3.11+
- **FastAPI**: 0.115+ (非同期Web フレームワーク)
- **Claude Agent SDK**: Anthropic公式SDK
- **Uvicorn**: 0.30+ (ASGIサーバー)
- **Redis**: 7.x (セッション管理)
- **Pydantic**: 2.x (データバリデーション)

## プロジェクト構造

```
backend/
├── app/
│   ├── api/                # API層
│   │   ├── routes/         # REST APIエンドポイント
│   │   └── websocket/      # WebSocketハンドラー
│   ├── core/               # コアビジネスロジック
│   │   ├── security/       # セキュリティ層
│   │   └── tools/          # カスタムツール
│   ├── models/             # データモデル
│   ├── services/           # ビジネスロジック層
│   ├── schemas/            # Pydanticスキーマ
│   ├── utils/              # ユーティリティ
│   ├── config.py           # 環境設定
│   └── main.py             # アプリケーションエントリポイント
├── tests/                  # テストコード
├── requirements.txt        # 本番依存関係
├── requirements-dev.txt    # 開発依存関係
├── Dockerfile              # Dockerイメージ定義
└── .env.example            # 環境変数サンプル

```

## セットアップ

### 1. 環境変数設定

```bash
cp .env.example .env
# .env ファイルを編集してANTHROPIC_API_KEYを設定
```

### 2. 依存関係インストール

```bash
pip install -r requirements.txt
# または開発環境の場合
pip install -r requirements-dev.txt
```

### 3. Redisの起動

```bash
# Dockerを使用する場合
docker run -d -p 6379:6379 redis:7-alpine

# または既存のRedisサーバーを使用
```

### 4. アプリケーション起動

```bash
# 開発モード (ホットリロード有効)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 本番モード
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Docker実行

```bash
# Docker Composeを使用する場合 (推奨)
docker-compose up -d

# 単体で実行する場合
docker build -t claude-code-backend .
docker run -p 8000:8000 --env-file .env claude-code-backend
```

## API エンドポイント

### REST API

- `GET /api/health` - ヘルスチェック
- `POST /api/projects` - プロジェクト作成
- `GET /api/projects` - プロジェクト一覧取得
- `GET /api/projects/{id}` - プロジェクト取得
- `PUT /api/projects/{id}` - プロジェクト更新
- `DELETE /api/projects/{id}` - プロジェクト削除
- `POST /api/sessions` - セッション作成
- `GET /api/sessions` - セッション一覧取得
- `GET /api/sessions/{id}` - セッション取得
- `PUT /api/sessions/{id}` - セッション更新
- `DELETE /api/sessions/{id}` - セッション削除
- `GET /api/files` - ファイル一覧取得
- `GET /api/files/content` - ファイル読み込み
- `POST /api/files/content` - ファイル書き込み
- `DELETE /api/files/content` - ファイル削除

### WebSocket API

- `ws://localhost:8000/ws/chat/{session_id}` - チャットWebSocket

#### WebSocketメッセージフォーマット

**クライアント → サーバー:**

```json
{
  "type": "chat",
  "content": "メッセージ内容",
  "files": [
    {
      "path": "file.py",
      "content": "ファイル内容"
    }
  ]
}
```

**サーバー → クライアント:**

```json
{
  "type": "text",
  "content": "レスポンステキスト",
  "session_id": "session-id"
}
```

## 開発

### テスト実行

```bash
# 全テスト実行
pytest

# カバレッジ付き
pytest --cov=app --cov-report=term-missing

# 特定のテストファイル
pytest tests/unit/test_claude_client.py
```

### コード品質チェック

```bash
# Ruff (Linter)
ruff check app/

# Black (Formatter)
black app/

# Mypy (Type Checker)
mypy app/

# Bandit (Security Scanner)
bandit -r app/
```

### ログレベル設定

```bash
# .env ファイルで設定
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

## アーキテクチャ

### レイヤー構成

1. **API Layer** (`api/`)
   - REST APIエンドポイント
   - WebSocketハンドラー
   - リクエスト/レスポンス処理

2. **Service Layer** (`services/`)
   - ビジネスロジック
   - トランザクション管理

3. **Core Layer** (`core/`)
   - Claude Agent SDK統合
   - セッション管理
   - プロジェクト管理
   - セキュリティ制御

4. **Model Layer** (`models/`)
   - データモデル定義
   - エラーモデル

### セキュリティ

- サンドボックス環境でコード実行
- ワークスペース外へのファイルアクセス制限
- 危険なコマンドのブロックリスト
- CORS設定
- 入力検証

## トラブルシューティング

### Redis接続エラー

```bash
# Redis が起動しているか確認
redis-cli ping
# PONG が返ってくれば正常
```

### Anthropic API エラー

```bash
# API キーが正しく設定されているか確認
echo $ANTHROPIC_API_KEY
```

### ワークスペース権限エラー

```bash
# ワークスペースディレクトリの権限確認
ls -la workspace/
# 必要に応じて権限変更
chmod 755 workspace/
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずIssueを開いて変更内容を議論してください。
