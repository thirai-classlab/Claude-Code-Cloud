# クイックスタートガイド

このガイドでは、Claude Code Docker環境を最短で起動する手順を説明します。

## 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- Anthropic API Key

## セットアップ手順（5分）

### 1. 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
vi .env  # または nano .env
```

最低限、以下の2つを設定してください：


```bash
# 必須: Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# 必須: セキュリティキー（32文字以上）
SECRET_KEY=$(openssl rand -hex 32)
```

### 2. セットアップの検証

```bash
./scripts/validate-setup.sh
```

全てのチェックが✓になることを確認してください。

### 3. サービスの起動

```bash
# Makefileを使用する場合
make up

# または直接docker-composeを使用
docker-compose up -d
```

### 4. 動作確認

数分待ってから、以下のURLにアクセス：

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- code-server: http://localhost:8080

### 5. ヘルスチェック

```bash
# バックエンドの状態確認
curl http://localhost:8000/api/health

# サービス一覧
docker-compose ps

# ログ確認
make logs
```

## 開発モードでの起動

ホットリロードを有効にする場合：

```bash
make dev
```

## よくある問題

### ポートが既に使用されている

.envファイルでポートを変更：

```bash
FRONTEND_PORT=3001
BACKEND_PORT=8001
```

### サービスが起動しない

```bash
# ログを確認
docker-compose logs backend
docker-compose logs frontend

# コンテナを再ビルド
make down
make build
make up
```

### Anthropic API Key エラー

.envファイルでAPIキーが正しく設定されているか確認：

```bash
grep ANTHROPIC_API_KEY .env
```

## サービスの停止

```bash
make down
```

## 次のステップ

1. [README.md](README.md) - 詳細なドキュメント
2. [doc/architecture-design.md](doc/architecture-design.md) - アーキテクチャ
3. [doc/docker-design.md](doc/docker-design.md) - Docker詳細設計

## サポート

問題が発生した場合：

```bash
# 診断情報の収集
docker-compose ps
docker-compose logs --tail=50
docker stats --no-stream
```

以上でセットアップ完了です！
