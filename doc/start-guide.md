# スタートガイド

ローカル環境でWeb版Claude Codeを起動するための手順書です。

---

## 前提条件

| ソフトウェア | バージョン | 確認コマンド |
|-------------|-----------|-------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.x | `docker compose version` |
| Git | 任意 | `git --version` |

| 項目 | 推奨 |
|------|------|
| メモリ | 8GB以上 |
| ディスク | 10GB以上の空き容量 |
| OS | macOS, Linux, Windows (WSL2) |

---

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd AGENTSDK
```

---

## 2. 環境変数の設定

```bash
# テンプレートをコピー
cp .env.example .env

# シークレットキーを生成
openssl rand -hex 32
```

`.env`ファイルを編集して `SECRET_KEY` を設定します。

| 項目 | 説明 | 例 |
|------|------|-----|
| SECRET_KEY | セキュリティキー（必須） | `a1b2c3d4e5f6...` |
| FRONTEND_PORT | フロントエンドポート | `3000` |
| BACKEND_PORT | バックエンドポート | `8000` |

> **Note**: APIキーは環境変数ではなく、Web UIのプロジェクト設定から登録します。

---

## 3. サービスの起動

```bash
# 標準構成で起動
make up

# または直接Docker Composeを使用
docker-compose up -d
```

初回起動時はDockerイメージのビルドに数分かかります。

---

## 4. 起動確認

```bash
# サービス状態を確認
make status

# または
docker-compose ps
```

全てのサービスが `running` になっていることを確認します。

| サービス | ポート | URL |
|----------|--------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| code-server | 8080 | http://localhost:8080 |
| MySQL | 3306 | - |

---

## 5. 次のステップ

環境が起動したら、[ユーザガイド](user-guide.md)に進んでください。

---

## トラブルシューティング

### サービスが起動しない

```bash
# ログを確認
make logs

# 特定サービスのログ
docker-compose logs backend
docker-compose logs frontend
```

### ポート競合

`.env`ファイルでポートを変更:

```
FRONTEND_PORT=3001
BACKEND_PORT=8001
```

### データベースエラー

```bash
# MySQLログを確認
docker-compose logs mysql
```

### 完全にリセットしたい場合

```bash
# サービス停止＋ボリューム削除
make clean

# 再起動
make up
```

---

## Makefileコマンド一覧

| コマンド | 説明 |
|----------|------|
| `make up` | サービス起動 |
| `make down` | サービス停止 |
| `make restart` | サービス再起動 |
| `make logs` | ログ表示 |
| `make status` | サービス状態確認 |
| `make dev` | 開発モードで起動 |
| `make clean` | リソース削除 |

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2025-01 | 初版作成 |
