# DinD Executor - 使用ガイド

> 作成日: 2025-12-20
> 最終更新: 2025-12-29
> バージョン: 1.1

Docker-in-Docker (DinD) を使用した分離実行環境のガイドです。

## 概要

DinD Executorは、Backend (Agent SDK) とcode-serverで共有のDocker実行環境を提供します。

**機能一覧:**

| 機能 | 説明 | 使用例 |
|------|------|--------|
| Python実行 | Pythonコードの分離実行 | `run_python_code()` |
| Shell実行 | シェルスクリプト実行 | `run_shell_script()` |
| 汎用コマンド | 任意のDockerイメージで実行 | `run_command()` |
| ビルド実行 | Dockerfileからビルド | `build_and_run()` |

```mermaid
flowchart TB
    subgraph Docker Compose環境
        subgraph Backend Container
            SDK[Agent SDK]
            DindExec[DinD Executor]
        end

        subgraph code-server Container
            Terminal[Terminal]
            DockerCLI[Docker CLI]
        end

        subgraph DinD Container
            DockerDaemon[Docker Daemon]
            ExecContainer[実行コンテナ]
        end

        Workspace[共有ワークスペース]
    end

    SDK --> DindExec
    DindExec -->|tcp://dind:2375| DockerDaemon
    Terminal --> DockerCLI
    DockerCLI -->|tcp://dind:2375| DockerDaemon
    DockerDaemon --> ExecContainer
    ExecContainer --> Workspace
    Backend --> Workspace
    code-server --> Workspace
```

## アーキテクチャ

```mermaid
stateDiagram-v2
    [*] --> DinD起動
    DinD起動 --> Backend起動
    DinD起動 --> CodeServer起動
    Backend起動 --> 実行可能
    CodeServer起動 --> 実行可能
    実行可能 --> コード実行
    コード実行 --> コンテナ起動
    コンテナ起動 --> ワークスペースマウント
    ワークスペースマウント --> 処理実行
    処理実行 --> 結果返却
    結果返却 --> コンテナ削除
    コンテナ削除 --> 実行可能
```

## セットアップ

### 1. DinD環境の起動

```bash
# DinDを含む全サービスを起動
docker-compose -f docker-compose.yml -f docker-compose.dind.yml up -d

# DinDの状態確認
docker-compose -f docker-compose.yml -f docker-compose.dind.yml ps
```

### 2. 環境変数の設定

`.env` ファイルに以下を追加:

```env
DIND_ENABLED=true
DOCKER_HOST=tcp://dind:2375
DIND_WORKSPACE_PATH=/workspaces
DOCKER_BUILDKIT=1
```

### 3. 動作確認

```bash
# Backendコンテナから
docker exec -it claude-backend docker info

# code-serverのターミナルから
docker info
```

## 使用方法

### Python APIでの使用

```python
from app.utils.dind_executor import get_executor

# Executorを取得
executor = get_executor()

# DinDが利用可能か確認
if not executor.is_available():
    print("DinD is not available")
    exit(1)

# Pythonコードを実行
result = executor.run_python_code(
    code='''
import sys
print(f"Python {sys.version}")
print("Hello from DinD!")
    ''',
    python_version="3.11",
)

print(f"Return code: {result['returncode']}")
print(f"Output: {result['stdout']}")
print(f"Error: {result['stderr']}")
```

### 実行パターン

#### 1. Pythonコード実行

```python
# シンプルな実行
result = executor.run_python_code(
    code="print('Hello, World!')",
    python_version="3.11",
)

# 依存パッケージ付き実行
result = executor.run_python_code(
    code='''
import requests
response = requests.get("https://api.github.com")
print(response.status_code)
    ''',
    python_version="3.11",
    requirements=["requests"],
    timeout=60,
)
```

#### 2. シェルスクリプト実行

```python
result = executor.run_shell_script(
    script='''
#!/bin/bash
echo "Current directory: $(pwd)"
ls -la
    ''',
    shell="/bin/bash",
    timeout=30,
)
```

#### 3. カスタムコマンド実行

```python
result = executor.run_command(
    image="node:20-alpine",
    command="node --version && npm --version",
    mount_workspace=True,
    timeout=30,
)
```

#### 4. ワークスペース内でのコード実行

```python
# ワークスペース内のファイルを実行
result = executor.run_command(
    image="python:3.11",
    command="python script.py",
    working_dir="/workspaces/session-id/project",
    mount_workspace=True,
)
```

#### 5. Dockerfileからビルドして実行

```python
dockerfile = '''
FROM python:3.11-slim
RUN pip install flask
COPY . /app
WORKDIR /app
CMD ["python", "app.py"]
'''

result = executor.build_and_run(
    dockerfile_content=dockerfile,
    context_path="session-id/my-project",
    timeout=300,
)
```

## ワークスペースの共有

全てのサービスが同じボリューム (`claude-workspace`) を共有:

| サービス | マウントポイント | 備考 |
|---------|-----------------|------|
| Host | `./workspace` | ホストディレクトリ |
| Backend | `/app/workspace` | APIからアクセス |
| code-server | `/home/coder/workspace` | VSCode Webからアクセス |
| DinD | `/workspaces` | Docker Daemon内 |
| 実行コンテナ | `/workspaces` | DinDからマウント |

## セキュリティ考慮事項

| 対策 | 実装 | 効果 |
|------|------|------|
| 分離実行 | 各実行は独立したコンテナ | 相互影響なし |
| リソース制限 | CPU/メモリ制限設定 | リソース枯渇防止 |
| タイムアウト | 全実行に時間制限 | 無限ループ防止 |
| ネットワーク分離 | 内部ネットワークのみ | 外部攻撃防止 |
| TLS無効化 | 内部通信専用 | パフォーマンス最適化 |

## トラブルシューティング

### DinDに接続できない

```bash
# DinDの状態確認
docker-compose -f docker-compose.yml -f docker-compose.dind.yml ps dind

# DinDのログ確認
docker-compose -f docker-compose.yml -f docker-compose.dind.yml logs dind

# ヘルスチェック確認
docker exec claude-dind docker info
```

### ワークスペースがマウントされない

```bash
# ボリュームの確認
docker volume inspect claude-workspace

# DinD内でのマウント確認
docker exec claude-dind ls -la /workspaces
```

### パフォーマンスが遅い

**推奨リソース配分:**

| サービス | CPU配分 | メモリ配分 |
|---------|---------|-----------|
| DinD | 40% | 40% |
| Backend | 30% | 30% |
| code-server | 20% | 20% |
| その他 | 10% | 10% |

DinDのリソース制限を調整:

```yaml
# docker-compose.dind.yml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

## ベストプラクティス

| 項目 | 推奨事項 | 理由 |
|------|---------|------|
| タイムアウト設定 | 必ず適切な値を設定 | 無限ループ防止 |
| エラーハンドリング | `returncode`を確認 | 失敗検知 |
| リソース管理 | 不要なイメージ・コンテナを削除 | ディスク節約 |
| ログ記録 | 実行履歴を保存 | 問題追跡容易化 |

## 実装例

### Agent SDK統合例

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.dind_executor import get_executor

router = APIRouter()

class CodeExecuteRequest(BaseModel):
    code: str
    language: str = "python"
    timeout: int = 60

@router.post("/execute")
async def execute_code(request: CodeExecuteRequest):
    executor = get_executor()

    if not executor.is_available():
        raise HTTPException(
            status_code=503,
            detail="Code execution service is not available"
        )

    try:
        if request.language == "python":
            result = executor.run_python_code(
                code=request.code,
                timeout=request.timeout,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language: {request.language}"
            )

        return {
            "success": result["returncode"] == 0,
            "output": result["stdout"],
            "error": result["stderr"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
```

## まとめ

DinD Executorにより、Agent SDKとcode-serverで共有の安全な実行環境を実現しました。

**実現された機能:**

| 機能 | 説明 | 状態 |
|------|------|:----:|
| 分離実行 | 各コードは独立したコンテナで実行 | ✅ |
| ワークスペース共有 | 全サービスが同一ボリュームを共有 | ✅ |
| 統一環境 | BackendとVSCode Webで同一Docker | ✅ |
| セキュリティ | リソース制限・タイムアウト・分離 | ✅ |

---

## 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [DinDセットアップガイド](./dind-setup-guide.md) | 環境構築手順 |
| [DinD実装サマリ](./dind-implementation-summary.md) | 実装詳細 |
| [Docker設計書](./docker-design.md) | インフラ全体設計 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-20 | 初版作成 |
| v1.1 | 2025-12-29 | テーブル形式に統一 |

---

**ドキュメント管理情報**

| 項目 | 値 |
|------|-----|
| バージョン | 1.1 |
| 最終更新 | 2025-12-29 |
| 作成者 | Claude Code |
| レビューステータス | ✅ 完了 |
