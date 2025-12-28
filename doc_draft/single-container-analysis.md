# Web版Claude Code - 単一コンテナ化分析と設計案

**作成日:** 2025-12-21
**バージョン:** 1.0
**ステータス:** 🔄 レビュー待ち

---

## 目次
1. [現状分析](#1-現状分析)
2. [単一コンテナ化のメリット・デメリット](#2-単一コンテナ化のメリットデメリット)
3. [技術的実現可能性評価](#3-技術的実現可能性評価)
4. [単一コンテナ設計案](#4-単一コンテナ設計案)
5. [推奨アプローチ](#5-推奨アプローチ)
6. [実装ロードマップ](#6-実装ロードマップ)

---

## 1. 現状分析

### 1.1 現在の構成

```mermaid
flowchart TB
    subgraph Current["現在の4コンテナ構成"]
        subgraph C1["frontend<br/>Next.js"]
            C1_P[Port: 3000]
            C1_R[リソース: 制限なし]
            C1_U[User: nextjs]
        end

        subgraph C2["backend<br/>FastAPI"]
            C2_P[Port: 8000]
            C2_R[リソース: CPU 2, MEM 4GB]
            C2_U[User: appuser]
        end

        subgraph C3["redis<br/>Redis 7.2"]
            C3_P[Port: 6379]
            C3_R[リソース: CPU 0.5, MEM 1GB]
            C3_U[User: redis]
        end

        subgraph C4["code-server<br/>VSCode Web"]
            C4_P[Port: 8080]
            C4_R[リソース: CPU 2, MEM 4GB]
            C4_U[User: coder]
        end
    end

    C1 -->|API/WS| C2
    C2 -->|Cache| C3
    C1 -.->|iframe| C4
    C2 -->|Workspace| V[共有ボリューム]
    C4 -->|Workspace| V
```

### 1.2 リソース使用状況

```mermaid
pie title 現在のリソース配分
    "backend CPU" : 2
    "code-server CPU" : 2
    "redis CPU" : 0.5
    "frontend CPU" : 未制限
```

```mermaid
pie title メモリ配分
    "backend MEM" : 4
    "code-server MEM" : 4
    "redis MEM" : 1
    "frontend MEM" : 未制限
```

### 1.3 依存関係

```mermaid
flowchart LR
    subgraph 起動順序依存
        R[redis]
        R -->|healthy| B[backend]
        B -->|healthy| F[frontend]
        CS[code-server]
    end

    subgraph データ依存
        B2[backend] -->|read/write| WS[workspace-data]
        CS2[code-server] -->|read/write| WS
        B2 -->|session| RD[redis-data]
    end
```

---

## 2. 単一コンテナ化のメリット・デメリット

### 2.1 メリット分析

```mermaid
flowchart TD
    subgraph メリット
        M1[デプロイの簡易化]
        M1 --> M1_1[docker run 1コマンドで起動]
        M1 --> M1_2[docker-compose不要]
        M1 --> M1_3[ポートマッピングが単純]

        M2[リソース効率]
        M2 --> M2_1[ネットワークオーバーヘッド削減]
        M2 --> M2_2[メモリ共有による効率化]
        M2 --> M2_3[プロセス間通信が高速]

        M3[運用の簡素化]
        M3 --> M3_1[ログ管理が一元化]
        M3 --> M3_2[ヘルスチェックが単純]
        M3 --> M3_3[バージョン管理が容易]

        M4[開発効率]
        M4 --> M4_1[環境構築が高速]
        M4 --> M4_2[デバッグが容易]
        M4 --> M4_3[ローカル開発が簡単]
    end
```

### 2.2 デメリット分析

```mermaid
flowchart TD
    subgraph デメリット
        D1[スケーラビリティの制限]
        D1 --> D1_1[コンポーネント個別スケール不可]
        D1 --> D1_2[水平スケールが困難]
        D1 --> D1_3[リソース配分の柔軟性低下]

        D2[保守性の低下]
        D2 --> D2_1[単一障害点SPOF]
        D2 --> D2_2[部分的な再起動不可]
        D2 --> D2_3[デバッグの複雑化]

        D3[技術的制約]
        D3 --> D3_1[異なる言語ランタイムの混在]
        D3 --> D3_2[イメージサイズの肥大化]
        D3 --> D3_3[ビルド時間の増加]

        D4[セキュリティリスク]
        D4 --> D4_1[攻撃対象領域の拡大]
        D4 --> D4_2[権限分離の困難]
        D4 --> D4_3[プロセス分離の欠如]
    end
```

### 2.3 メリット・デメリット比較表

```mermaid
quadrantChart
    title メリット・デメリット評価
    x-axis 実装容易性 低 --> 高
    y-axis ビジネス価値 低 --> 高
    quadrant-1 高優先度
    quadrant-2 要検討
    quadrant-3 低優先度
    quadrant-4 クイックウィン
    デプロイ簡易化: [0.8, 0.7]
    リソース効率: [0.6, 0.5]
    運用簡素化: [0.7, 0.6]
    開発効率: [0.8, 0.8]
    スケーラビリティ: [0.3, 0.8]
    保守性: [0.4, 0.7]
    セキュリティ: [0.5, 0.9]
```

---

## 3. 技術的実現可能性評価

### 3.1 アーキテクチャパターン選択

```mermaid
flowchart LR
    subgraph パターン1: All-in-One モノリス
        P1[単一プロセス管理]
        P1 --> P1_A[supervisord / systemd]
        P1 --> P1_B[複数サービス起動]
        P1 --> P1_C[プロセス監視]
    end

    subgraph パターン2: リバースプロキシ統合
        P2[Nginx/Caddy]
        P2 --> P2_A[フロントエンドルーティング]
        P2 --> P2_B[バックエンドプロキシ]
        P2 --> P2_C[code-serverプロキシ]
    end

    subgraph パターン3: 組み込みRedis
        P3[Redis埋め込み]
        P3 --> P3_A[redis-server起動]
        P3 --> P3_B[ローカルソケット通信]
        P3 --> P3_C[メモリ共有]
    end
```

### 3.2 技術要素の互換性

```mermaid
flowchart TD
    subgraph 互換性評価
        T1[Node.js 20.11 + Python 3.11]
        T1 --> T1_R[✅ 可能: マルチステージビルド]

        T2[Redis組み込み]
        T2 --> T2_R[✅ 可能: redis-server起動]

        T3[複数ポート公開]
        T3 --> T3_R[⚠️ 注意: 内部ルーティング必要]

        T4[プロセス管理]
        T4 --> T4_R[✅ 可能: supervisord]

        T5[共有ワークスペース]
        T5 --> T5_R[✅ 可能: 同一ファイルシステム]

        T6[code-server統合]
        T6 --> T6_R[⚠️ 困難: 別イメージ推奨]
    end
```

### 3.3 実現可能性スコア

```mermaid
flowchart LR
    subgraph 評価項目別スコア
        E1[技術的実現可能性: 70%]
        E1 --> E1_D[Node + Python可能だがRedis組み込みに課題]

        E2[運用実現可能性: 50%]
        E2 --> E2_D[プロセス管理の複雑さ]

        E3[保守実現可能性: 40%]
        E3 --> E3_D[デバッグとトラブルシューティング困難]

        E4[セキュリティ実現可能性: 30%]
        E4 --> E4_D[権限分離とプロセス分離の欠如]

        E5[総合評価: 48%]
        E5 --> E5_D[⚠️ リスク高 - 推奨しない]
    end
```

---

## 4. 単一コンテナ設計案

### 4.1 完全統合型アーキテクチャ

```mermaid
flowchart TB
    subgraph SingleContainer["単一コンテナ構成案"]
        subgraph ProcessManager["プロセス管理: supervisord"]
            PM[supervisor]
        end

        subgraph Services["サービス群"]
            S1[Nginx<br/>Port: 80/443]
            S2[Next.js<br/>Internal: 3000]
            S3[FastAPI<br/>Internal: 8000]
            S4[Redis<br/>Socket: /tmp/redis.sock]
            S5[code-server<br/>Internal: 8080]
        end

        PM --> S1
        PM --> S2
        PM --> S3
        PM --> S4
        PM --> S5

        S1 -->|Proxy /| S2
        S1 -->|Proxy /api| S3
        S1 -->|Proxy /code| S5
        S3 -->|Socket| S4
    end

    subgraph External["外部アクセス"]
        USER[User]
    end

    USER -->|Port: 80| S1
```

### 4.2 Dockerfile設計

```mermaid
flowchart TD
    subgraph MultiStage["マルチステージビルド"]
        STAGE1[Stage 1: Base<br/>Ubuntu 22.04]
        STAGE1 --> STAGE1_D[Node.js + Python + Redis インストール]

        STAGE2[Stage 2: Dependencies<br/>依存関係構築]
        STAGE2 --> STAGE2_D[npm install + pip install]

        STAGE3[Stage 3: Build<br/>アプリケーションビルド]
        STAGE3 --> STAGE3_D[Next.js build]

        STAGE4[Stage 4: Runtime<br/>本番イメージ]
        STAGE4 --> STAGE4_D[supervisord設定<br/>全サービス起動]
    end

    STAGE1 --> STAGE2 --> STAGE3 --> STAGE4
```

### 4.3 単一コンテナDockerfile

```dockerfile
# ============================================
# Stage 1: Base - OS + Runtime
# ============================================
FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and runtimes
RUN apt-get update && apt-get install -y \
    # Build tools
    curl wget git build-essential ca-certificates \
    # Node.js 20.x
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    # Python 3.11
    && apt-get install -y python3.11 python3.11-dev python3-pip \
    # Redis
    && apt-get install -y redis-server \
    # Nginx
    && apt-get install -y nginx \
    # Supervisor
    && apt-get install -y supervisor \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Create application user
RUN useradd -r -u 1000 -m -s /bin/bash appuser

# Create directories
WORKDIR /app
RUN mkdir -p /app/frontend /app/backend /app/workspace /app/logs

# ============================================
# Stage 2: Backend Dependencies
# ============================================
FROM base as backend-deps

WORKDIR /app/backend
COPY src/backend/pyproject.toml src/backend/poetry.lock ./
RUN poetry install --no-root --no-dev

# ============================================
# Stage 3: Frontend Dependencies
# ============================================
FROM base as frontend-deps

WORKDIR /app/frontend
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci --only=production

# ============================================
# Stage 4: Frontend Build
# ============================================
FROM frontend-deps as frontend-builder

COPY src/frontend/ ./
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=/api/ws
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build

# ============================================
# Stage 5: Runtime - Final Image
# ============================================
FROM base as runtime

# Copy backend
COPY --from=backend-deps /app/backend/.venv /app/backend/.venv
COPY src/backend/app /app/backend/app
ENV PATH="/app/backend/.venv/bin:$PATH"

# Copy frontend
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/
COPY --from=frontend-builder /app/frontend/next.config.js /app/frontend/

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Copy configuration files
COPY docker/single-container/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/single-container/nginx.conf /etc/nginx/nginx.conf
COPY docker/single-container/redis.conf /etc/redis/redis.conf

# Set permissions
RUN chown -R appuser:appuser /app/workspace /app/logs

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

### 4.4 supervisord設定

```conf
[supervisord]
nodaemon=true
logfile=/app/logs/supervisord.log
pidfile=/var/run/supervisord.pid
user=root

[program:redis]
command=/usr/bin/redis-server /etc/redis/redis.conf
autostart=true
autorestart=true
stdout_logfile=/app/logs/redis.log
stderr_logfile=/app/logs/redis-error.log
priority=1

[program:backend]
command=/app/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/app/logs/backend.log
stderr_logfile=/app/logs/backend-error.log
environment=REDIS_URL="unix:///tmp/redis.sock",WORKSPACE_PATH="/app/workspace"
user=appuser
priority=2

[program:frontend]
command=/usr/bin/node /app/frontend/node_modules/next/dist/bin/next start -p 3000
directory=/app/frontend
autostart=true
autorestart=true
stdout_logfile=/app/logs/frontend.log
stderr_logfile=/app/logs/frontend-error.log
environment=NODE_ENV="production"
user=appuser
priority=3

[program:code-server]
command=/usr/bin/code-server --bind-addr 127.0.0.1:8080 --auth none /app/workspace
autostart=true
autorestart=true
stdout_logfile=/app/logs/code-server.log
stderr_logfile=/app/logs/code-server-error.log
user=appuser
priority=4

[program:nginx]
command=/usr/sbin/nginx -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/app/logs/nginx.log
stderr_logfile=/app/logs/nginx-error.log
priority=5
```

### 4.5 Nginx設定

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /app/logs/nginx-access.log;
    error_log /app/logs/nginx-error.log;

    # Frontend (Next.js)
    server {
        listen 80 default_server;
        server_name _;

        # Frontend static files and pages
        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /api/ws {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # code-server
        location /code/ {
            proxy_pass http://127.0.0.1:8080/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 4.6 起動コマンド

```bash
# ビルド
docker build -f docker/single-container/Dockerfile -t claude-code:single .

# 起動
docker run -d \
  --name claude-code \
  -p 80:80 \
  -v $(pwd)/workspace:/app/workspace \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  -e SECRET_KEY=your-secret-key \
  claude-code:single

# ログ確認
docker logs -f claude-code

# シェルアクセス
docker exec -it claude-code bash
```

---

## 5. 推奨アプローチ

### 5.1 推奨度評価

```mermaid
flowchart TD
    subgraph 推奨アプローチ評価
        OPT1[オプション1: 現状維持 4コンテナ]
        OPT1 --> OPT1_S[推奨度: ★★★★★ 95点]
        OPT1_S --> OPT1_R[理由: スケーラビリティ、保守性、セキュリティ]

        OPT2[オプション2: 3コンテナ統合]
        OPT2 --> OPT2_S[推奨度: ★★★☆☆ 70点]
        OPT2_S --> OPT2_R[理由: バランス型、code-server分離]

        OPT3[オプション3: 完全統合 単一コンテナ]
        OPT3 --> OPT3_S[推奨度: ★★☆☆☆ 40点]
        OPT3_S --> OPT3_R[理由: デプロイ簡易だが保守性低]
    end
```

### 5.2 ユースケース別推奨

```mermaid
flowchart LR
    subgraph ユースケース別推奨
        UC1[個人開発・学習目的]
        UC1 --> UC1_R[推奨: オプション2 or 3<br/>簡易性重視]

        UC2[チーム開発]
        UC2 --> UC2_R[推奨: オプション1<br/>開発効率重視]

        UC3[本番運用]
        UC3 --> UC3_R[推奨: オプション1<br/>信頼性重視]

        UC4[デモ・配布]
        UC4 --> UC4_R[推奨: オプション3<br/>配布容易性重視]
    end
```

### 5.3 最終推奨: 3コンテナ統合（ハイブリッド）

```mermaid
flowchart TB
    subgraph Recommended["推奨: 3コンテナ統合アプローチ"]
        subgraph C1["コンテナ1: Application<br/>Frontend + Backend + Redis"]
            C1_N[Nginx]
            C1_F[Next.js]
            C1_B[FastAPI]
            C1_R[Redis]
        end

        subgraph C2["コンテナ2: code-server<br/>オプショナル"]
            C2_CS[VSCode Web]
        end

        subgraph C3["コンテナ3: Database<br/>将来拡張用"]
            C3_DB[PostgreSQL<br/>将来追加]
        end
    end

    C1_N --> C1_F
    C1_N --> C1_B
    C1_B --> C1_R
    C1 -->|共有ボリューム| C2
```

#### 3コンテナ統合のメリット

```mermaid
flowchart LR
    subgraph 3コンテナ統合のメリット
        M1[デプロイ簡易化]
        M1 --> M1_D[メインアプリは1コンテナ<br/>code-serverは任意起動]

        M2[保守性維持]
        M2 --> M2_D[code-server独立で障害分離<br/>本体は安定稼働]

        M3[リソース効率]
        M3 --> M3_D[内部通信が高速<br/>メモリ共有]

        M4[スケーラビリティ]
        M4 --> M4_D[アプリコンテナのみ複製可能<br/>code-serverは共有]
    end
```

---

## 6. 実装ロードマップ

### 6.1 フェーズ別実装計画

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: 検証 1週間"]
        P1_1[PoC実装<br/>supervisord検証]
        P1_2[Nginx統合テスト]
        P1_3[プロセス管理検証]
    end

    subgraph Phase2["Phase 2: 実装 2週間"]
        P2_1[Dockerfile作成]
        P2_2[設定ファイル整備]
        P2_3[起動スクリプト作成]
    end

    subgraph Phase3["Phase 3: テスト 1週間"]
        P3_1[機能テスト]
        P3_2[負荷テスト]
        P3_3[セキュリティ監査]
    end

    subgraph Phase4["Phase 4: 文書化"]
        P4_1[ドキュメント作成]
        P4_2[トラブルシューティング]
        P4_3[移行ガイド]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4
```

### 6.2 実装チェックリスト

```mermaid
flowchart TD
    subgraph 実装チェックリスト
        T1[技術検証]
        T1 --> T1_1[☐ supervisord動作確認]
        T1 --> T1_2[☐ Nginx + Next.js統合]
        T1 --> T1_3[☐ Redis UNIXソケット通信]
        T1 --> T1_4[☐ プロセス間通信検証]

        T2[セキュリティ]
        T2 --> T2_1[☐ 非rootユーザー実行]
        T2 --> T2_2[☐ ファイル権限設定]
        T2 --> T2_3[☐ ネットワーク分離]

        T3[運用]
        T3 --> T3_1[☐ ログローテーション]
        T3 --> T3_2[☐ ヘルスチェック実装]
        T3 --> T3_3[☐ グレースフルシャットダウン]

        T4[ドキュメント]
        T4 --> T4_1[☐ 起動手順書]
        T4 --> T4_2[☐ トラブルシューティング]
        T4 --> T4_3[☐ 移行ガイド]
    end
```

### 6.3 リスク評価と対策

```mermaid
flowchart LR
    subgraph リスクと対策
        R1[リスク1: プロセス管理の複雑化]
        R1 --> R1_M[対策: 徹底的なテスト<br/>supervisord設定の文書化]

        R2[リスク2: デバッグ困難]
        R2 --> R2_M[対策: 構造化ログ実装<br/>個別ログファイル分離]

        R3[リスク3: イメージサイズ肥大]
        R3 --> R3_M[対策: マルチステージビルド<br/>不要ファイル削除]

        R4[リスク4: セキュリティリスク]
        R4 --> R4_M[対策: 最小権限原則<br/>定期的な脆弱性スキャン]
    end
```

---

## 7. まとめ

### 7.1 結論

```mermaid
flowchart TD
    subgraph 最終結論
        C1[ユースケース分析]
        C1 --> C1_R{目的は何か?}

        C1_R -->|個人学習・デモ| R1[推奨: 3コンテナ統合]
        C1_R -->|チーム開発| R2[推奨: 現状維持 4コンテナ]
        C1_R -->|本番運用| R3[推奨: 現状維持 4コンテナ]
        C1_R -->|配布・簡易化| R4[推奨: 完全統合 単一コンテナ]

        R1 --> IMPL1[実装: Application統合<br/>code-server分離]
        R2 --> IMPL2[実装: 変更なし<br/>継続運用]
        R3 --> IMPL3[実装: Kubernetes移行検討]
        R4 --> IMPL4[実装: 本設計案を採用]
    end
```

### 7.2 推奨事項

```mermaid
classDiagram
    class 推奨事項 {
        第1推奨: 現状維持 4コンテナ構成
        理由: スケーラビリティ、保守性、セキュリティのバランスが最良
        適用: チーム開発、本番運用
        ---
        第2推奨: 3コンテナ統合 ハイブリッド
        理由: デプロイ簡易化とスケーラビリティの両立
        適用: 個人開発、小規模チーム
        ---
        第3推奨: 完全統合 単一コンテナ
        理由: 最大限の簡易化、配布容易
        適用: デモ、学習目的、個人利用
        注意: 本番環境では非推奨
    }
```

### 7.3 次のアクション

1. **要件確認**: ユーザーのユースケースと優先事項を明確化
2. **PoC実装**: 推奨アプローチのプロトタイプ作成
3. **性能評価**: ベンチマーク比較（4コンテナ vs 統合）
4. **移行計画**: 採用する構成への移行手順書作成
5. **ドキュメント整備**: 運用マニュアル、トラブルシューティングガイド

---

## 付録

### A. 比較表: 4コンテナ vs 単一コンテナ

```mermaid
flowchart LR
    subgraph 4コンテナ構成
        A1[デプロイ: ★★★☆☆]
        A2[保守性: ★★★★★]
        A3[スケール: ★★★★★]
        A4[セキュリティ: ★★★★★]
        A5[リソース: ★★★☆☆]
        A6[開発速度: ★★★★☆]
    end

    subgraph 単一コンテナ構成
        B1[デプロイ: ★★★★★]
        B2[保守性: ★★☆☆☆]
        B3[スケール: ★★☆☆☆]
        B4[セキュリティ: ★★☆☆☆]
        B5[リソース: ★★★★☆]
        B6[開発速度: ★★★★★]
    end
```

### B. 実装コスト見積もり

```mermaid
pie title 実装工数配分 合計: 40時間
    "設計・検証" : 8
    "Dockerfile作成" : 10
    "設定ファイル作成" : 6
    "テスト・デバッグ" : 10
    "ドキュメント作成" : 6
```

---

**ドキュメント管理情報**

```mermaid
classDiagram
    class ドキュメント情報 {
        ファイル名: single-container-analysis.md
        保存場所: doc_draft/
        バージョン: 1.0
        作成日: 2025-12-21
        ステータス: レビュー待ち
        関連文書: docker-design.md, architecture-design.md
    }
```

---

**変更履歴**

- **v1.0 (2025-12-21)**: 初版作成 - 単一コンテナ化の分析と設計案
