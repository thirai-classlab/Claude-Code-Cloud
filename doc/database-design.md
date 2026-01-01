# Web版Claude Code データベース設計書

**作成日:** 2025-12-29
**最終更新:** 2026-01-02
**バージョン:** 1.3
**ステータス:** ✅ 完了
**対象:** MySQL 8.0 データベース設計
**関連ファイル:** `src/backend/app/models/database.py`

---

## 目次

- [1. 概要](#1-概要)
  - [1.1 データベース構成](#11-データベース構成)
  - [1.2 テーブル一覧](#12-テーブル一覧)
  - [1.3 技術スタック](#13-技術スタック)
- [2. ER図](#2-er図)
  - [2.1 全体ER図](#21-全体er図)
  - [2.2 コアデータ ER図](#22-コアデータ-er図)
  - [2.3 プロジェクト設定 ER図](#23-プロジェクト設定-er図)
- [3. テーブル詳細定義](#3-テーブル詳細定義)
  - [3.1 users テーブル](#31-users-テーブル)
  - [3.2 projects テーブル](#32-projects-テーブル)
  - [3.3 project_shares テーブル](#33-project_shares-テーブル)
  - [3.4 sessions テーブル](#34-sessions-テーブル)
  - [3.5 messages テーブル](#35-messages-テーブル)
  - [3.6 cron_logs テーブル](#36-cron_logs-テーブル)
  - [3.7 project_mcp_servers テーブル](#37-project_mcp_servers-テーブル)
  - [3.8 project_agents テーブル](#38-project_agents-テーブル)
  - [3.9 project_skills テーブル](#39-project_skills-テーブル)
  - [3.10 project_commands テーブル](#310-project_commands-テーブル)
  - [3.11 project_templates テーブル](#311-project_templates-テーブル)
  - [3.12 project_template_files テーブル](#312-project_template_files-テーブル)
- [4. リレーションシップ](#4-リレーションシップ)
  - [4.1 リレーション一覧](#41-リレーション一覧)
  - [4.2 外部キー制約](#42-外部キー制約)
  - [4.3 カスケード削除フロー](#43-カスケード削除フロー)
- [5. データフロー](#5-データフロー)
  - [5.1 プロジェクト作成フロー](#51-プロジェクト作成フロー)
  - [5.2 チャットメッセージフロー](#52-チャットメッセージフロー)
  - [5.3 セッション再開フロー](#53-セッション再開フロー)
  - [5.4 プロジェクト設定読み込みフロー](#54-プロジェクト設定読み込みフロー)
  - [5.5 テンプレート適用フロー](#55-テンプレート適用フロー)
- [6. インデックス設計](#6-インデックス設計)
  - [6.1 インデックス一覧](#61-インデックス一覧)
  - [6.2 インデックス詳細](#62-インデックス詳細)
  - [6.3 クエリパターンとインデックス活用](#63-クエリパターンとインデックス活用)
- [7. セキュリティ考慮事項](#7-セキュリティ考慮事項)
  - [7.1 データ保護](#71-データ保護)
  - [7.2 セキュリティチェックリスト](#72-セキュリティチェックリスト)
  - [7.3 権限モデル](#73-権限モデル)
  - [7.4 データマスキング](#74-データマスキング)
- [8. マイグレーション戦略](#8-マイグレーション戦略)
  - [8.1 マイグレーションツール](#81-マイグレーションツール)
  - [8.2 マイグレーション手順](#82-マイグレーション手順)
  - [8.3 マイグレーション例](#83-マイグレーション例)
  - [8.4 マイグレーションベストプラクティス](#84-マイグレーションベストプラクティス)
- [9. パフォーマンス最適化](#9-パフォーマンス最適化)
  - [9.1 クエリ最適化](#91-クエリ最適化)
  - [9.2 N+1問題の回避](#92-n1問題の回避)
  - [9.3 パーティショニング検討](#93-パーティショニング検討)
  - [9.4 接続プール設定](#94-接続プール設定)
  - [9.5 キャッシュ戦略](#95-キャッシュ戦略)
- [10. 運用ガイドライン](#10-運用ガイドライン)
  - [10.1 バックアップ戦略](#101-バックアップ戦略)
  - [10.2 監視項目](#102-監視項目)
  - [10.3 メンテナンスタスク](#103-メンテナンスタスク)
  - [10.4 データ保持ポリシー](#104-データ保持ポリシー)
  - [10.5 トラブルシューティング](#105-トラブルシューティング)
- [付録](#付録)
  - [A. DDL一括出力](#a-ddl一括出力)
  - [B. SQLAlchemyモデル参照](#b-sqlalchemyモデル参照)
  - [C. 関連ドキュメント](#c-関連ドキュメント)
- [変更履歴](#変更履歴)

---

## 1. 概要

### 1.1 データベース構成

本システムはMySQL 8.0を使用し、以下の主要なデータドメインを管理します。

```mermaid
flowchart TB
    subgraph Core["コアデータ"]
        Users["Users<br/>ユーザー管理"]
        Projects["Projects<br/>プロジェクト管理"]
        Sessions["Sessions<br/>セッション管理"]
        Messages["Messages<br/>メッセージ履歴"]
    end

    subgraph Config["プロジェクト設定"]
        MCP["MCP Servers<br/>MCPサーバー設定"]
        Agents["Agents<br/>エージェント設定"]
        Skills["Skills<br/>スキル設定"]
        Commands["Commands<br/>コマンド設定"]
    end

    subgraph Share["共有・テンプレート"]
        Shares["Project Shares<br/>プロジェクト共有"]
        Templates["Templates<br/>テンプレート"]
        TemplateFiles["Template Files<br/>テンプレートファイル"]
    end

    subgraph System["システム"]
        CronLogs["Cron Logs<br/>ジョブ実行ログ"]
    end

    Users --> Projects
    Users --> Shares
    Users --> Templates
    Projects --> Sessions
    Projects --> Shares
    Projects --> MCP
    Projects --> Agents
    Projects --> Skills
    Projects --> Commands
    Sessions --> Messages
    Templates --> TemplateFiles
```

### 1.2 テーブル一覧

| テーブル名 | 説明 | レコード目安 |
|-----------|------|-------------|
| users | ユーザー情報 | ~1,000 |
| projects | プロジェクト情報 | ~10,000 |
| project_shares | プロジェクト共有設定 | ~5,000 |
| sessions | チャットセッション | ~100,000 |
| messages | メッセージ履歴 | ~10,000,000 |
| cron_logs | Cronジョブ実行ログ | ~100,000 |
| project_mcp_servers | MCPサーバー設定 | ~20,000 |
| project_agents | エージェント設定 | ~30,000 |
| project_skills | スキル設定 | ~50,000 |
| project_commands | コマンド設定 | ~30,000 |
| project_templates | プロジェクトテンプレート | ~1,000 |
| project_template_files | テンプレートファイル | ~10,000 |

### 1.3 技術スタック

```mermaid
flowchart LR
    subgraph Database["データベース層"]
        MySQL["MySQL 8.0"]
        Charset["utf8mb4<br/>絵文字対応"]
        Engine["InnoDB<br/>トランザクション対応"]
    end

    subgraph ORM["ORM層"]
        SQLAlchemy["SQLAlchemy 2.x"]
        Pydantic["Pydantic 2.x<br/>スキーマ定義"]
    end

    subgraph App["アプリケーション層"]
        FastAPI["FastAPI"]
        Services["Services<br/>ビジネスロジック"]
    end

    App --> ORM --> Database
```

---

## 2. ER図

### 2.1 全体ER図

```mermaid
erDiagram
    users ||--o{ projects : owns
    users ||--o{ project_shares : shares
    users ||--o{ project_shares : shared_by
    users ||--o{ project_templates : creates

    projects ||--o{ sessions : contains
    projects ||--o{ project_shares : shared
    projects ||--o{ project_mcp_servers : has
    projects ||--o{ project_agents : has
    projects ||--o{ project_skills : has
    projects ||--o{ project_commands : has

    sessions ||--o{ messages : contains

    project_templates ||--o{ project_template_files : contains

    users {
        string id PK "UUID"
        string email UK "NOT NULL"
        string hashed_password "NOT NULL"
        string display_name
        int is_active "DEFAULT 1"
        int is_superuser "DEFAULT 0"
        int is_verified "DEFAULT 0"
        datetime created_at
        datetime updated_at
    }

    projects {
        string id PK "UUID"
        string name "NOT NULL"
        string description
        string user_id FK
        enum status "active|archived|deleted"
        string workspace_path
        int session_count "DEFAULT 0"
        string api_key
        float cost_limit_daily
        float cost_limit_weekly
        float cost_limit_monthly
        datetime created_at
        datetime updated_at
    }

    project_shares {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string user_id FK "NOT NULL"
        enum permission_level "read|write|admin"
        string shared_by FK
        datetime created_at
    }

    sessions {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string name
        enum status "active|idle|processing|closed"
        string user_id
        string model "DEFAULT claude-opus-4-5"
        string sdk_session_id "Claude SDK session ID"
        int message_count "DEFAULT 0"
        int total_tokens "DEFAULT 0"
        float total_cost_usd "DEFAULT 0"
        datetime created_at
        datetime updated_at
        datetime last_activity_at
    }

    messages {
        string id PK "UUID"
        string session_id FK "NOT NULL"
        enum role "user|assistant|system"
        text content "NOT NULL"
        int tokens
        datetime created_at
    }

    cron_logs {
        int id PK "AUTO_INCREMENT"
        string job_id "NOT NULL"
        string status "NOT NULL"
        datetime started_at "NOT NULL"
        datetime finished_at
        text result
        text error
        datetime created_at
    }

    project_mcp_servers {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string name "NOT NULL"
        string command "NOT NULL"
        json args "DEFAULT []"
        json env "DEFAULT {}"
        bool enabled "DEFAULT TRUE"
        json enabled_tools
        datetime created_at
        datetime updated_at
    }

    project_agents {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string name "NOT NULL"
        string description
        string category "DEFAULT custom"
        string model "DEFAULT sonnet"
        json tools "DEFAULT []"
        text system_prompt
        bool enabled "DEFAULT TRUE"
        datetime created_at
        datetime updated_at
    }

    project_skills {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string name "NOT NULL"
        string description
        string category "DEFAULT custom"
        text content
        bool enabled "DEFAULT TRUE"
        datetime created_at
        datetime updated_at
    }

    project_commands {
        string id PK "UUID"
        string project_id FK "NOT NULL"
        string name "NOT NULL"
        string description
        string category "DEFAULT custom"
        text content
        bool enabled "DEFAULT TRUE"
        datetime created_at
        datetime updated_at
    }

    project_templates {
        string id PK "UUID"
        string user_id FK "NOT NULL"
        string name "NOT NULL"
        string description
        bool is_public "DEFAULT FALSE"
        json mcp_servers "DEFAULT []"
        json agents "DEFAULT []"
        json skills "DEFAULT []"
        json commands "DEFAULT []"
        datetime created_at
        datetime updated_at
    }

    project_template_files {
        string id PK "UUID"
        string template_id FK "NOT NULL"
        string file_path "NOT NULL"
        text content
        datetime created_at
    }
```

### 2.2 コアデータ ER図

```mermaid
erDiagram
    users ||--o{ projects : "1:N owns"
    projects ||--o{ sessions : "1:N contains"
    sessions ||--o{ messages : "1:N contains"

    users {
        string id PK
        string email UK
        string hashed_password
        string display_name
        datetime created_at
        datetime updated_at
    }

    projects {
        string id PK
        string name
        string user_id FK
        enum status
        int session_count
        datetime created_at
        datetime updated_at
    }

    sessions {
        string id PK
        string project_id FK
        string name
        enum status
        string sdk_session_id
        int message_count
        int total_tokens
        float total_cost_usd
        datetime last_activity_at
    }

    messages {
        string id PK
        string session_id FK
        enum role
        text content
        int tokens
        datetime created_at
    }
```

### 2.3 プロジェクト設定 ER図

```mermaid
erDiagram
    projects ||--o{ project_mcp_servers : "1:N"
    projects ||--o{ project_agents : "1:N"
    projects ||--o{ project_skills : "1:N"
    projects ||--o{ project_commands : "1:N"

    projects {
        string id PK
        string name
    }

    project_mcp_servers {
        string id PK
        string project_id FK
        string name UK
        string command
        json args
        json env
        bool enabled
        json enabled_tools
    }

    project_agents {
        string id PK
        string project_id FK
        string name UK
        string description
        string category
        string model
        json tools
        text system_prompt
        bool enabled
    }

    project_skills {
        string id PK
        string project_id FK
        string name UK
        string description
        string category
        text content
        bool enabled
    }

    project_commands {
        string id PK
        string project_id FK
        string name UK
        string description
        string category
        text content
        bool enabled
    }
```

---

## 3. テーブル詳細定義

### 3.1 users テーブル

ユーザー情報を管理するテーブル。FastAPI-Users互換の設計。

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active INTEGER NOT NULL DEFAULT 1,
    is_superuser INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| email | VARCHAR(255) | NO | - | メールアドレス（一意） |
| hashed_password | VARCHAR(255) | NO | - | ハッシュ化されたパスワード |
| display_name | VARCHAR(100) | YES | NULL | 表示名 |
| is_active | INTEGER | NO | 1 | アクティブフラグ（0/1） |
| is_superuser | INTEGER | NO | 0 | 管理者フラグ（0/1） |
| is_verified | INTEGER | NO | 0 | メール確認済みフラグ（0/1） |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**設計ポイント:**
- `is_active`等のBoolean値はMySQLとの互換性のためINTEGER型を使用
- パスワードはbcryptでハッシュ化して保存
- UUIDはハイフン付き36文字形式

---

### 3.2 projects テーブル

プロジェクト情報を管理するテーブル。

```sql
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    user_id VARCHAR(36),
    status ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active',
    workspace_path VARCHAR(500),
    session_count INTEGER DEFAULT 0,
    api_key VARCHAR(500),
    cost_limit_daily FLOAT,
    cost_limit_weekly FLOAT,
    cost_limit_monthly FLOAT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_projects_user_id (user_id),
    INDEX ix_projects_user_status (user_id, status),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| name | VARCHAR(100) | NO | - | プロジェクト名 |
| description | VARCHAR(500) | YES | NULL | プロジェクト説明 |
| user_id | VARCHAR(36) | YES | NULL | オーナーユーザーID |
| status | ENUM | NO | 'active' | ステータス |
| workspace_path | VARCHAR(500) | YES | NULL | ワークスペースパス |
| session_count | INTEGER | YES | 0 | セッション数（キャッシュ） |
| api_key | VARCHAR(500) | YES | NULL | プロジェクト固有APIキー |
| cost_limit_daily | FLOAT | YES | NULL | 日次コスト上限（USD） |
| cost_limit_weekly | FLOAT | YES | NULL | 週次コスト上限（USD） |
| cost_limit_monthly | FLOAT | YES | NULL | 月次コスト上限（USD） |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ステータス遷移図:**

```mermaid
stateDiagram-v2
    [*] --> active: 作成
    active --> archived: アーカイブ
    archived --> active: 復元
    active --> deleted: 削除
    archived --> deleted: 削除
    deleted --> [*]: 物理削除
```

---

### 3.3 project_shares テーブル

プロジェクト共有情報を管理するテーブル。

```sql
CREATE TABLE project_shares (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission_level ENUM('read', 'write', 'admin') NOT NULL DEFAULT 'read',
    shared_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_shares_project_user (project_id, user_id),
    INDEX ix_project_shares_project_user (project_id, user_id),
    INDEX ix_project_shares_user_id (user_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 対象プロジェクトID |
| user_id | VARCHAR(36) | NO | - | 共有先ユーザーID |
| permission_level | ENUM | NO | 'read' | 権限レベル |
| shared_by | VARCHAR(36) | YES | NULL | 共有元ユーザーID |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

**権限レベル:**

```mermaid
flowchart LR
    subgraph 権限階層
        read["read<br/>閲覧のみ"]
        write["write<br/>編集可能"]
        admin["admin<br/>管理者権限"]
    end

    read --> write --> admin
```

| 権限 | 説明 | 操作可能範囲 |
|------|------|-------------|
| read | 閲覧権限 | セッション閲覧、メッセージ閲覧 |
| write | 編集権限 | read + セッション作成・編集、ファイル操作 |
| admin | 管理者権限 | write + プロジェクト設定変更、共有管理 |

---

### 3.4 sessions テーブル

チャットセッション情報を管理するテーブル。

```sql
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100),
    status ENUM('active', 'idle', 'processing', 'closed') NOT NULL DEFAULT 'active',
    user_id VARCHAR(36),
    model VARCHAR(50) NOT NULL DEFAULT 'claude-opus-4-5',
    sdk_session_id VARCHAR(100),
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd FLOAT DEFAULT 0.0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_sessions_project_id (project_id),
    INDEX ix_sessions_project_status (project_id, status),
    INDEX ix_sessions_last_activity (last_activity_at),
    INDEX ix_sessions_user_id (user_id),
    INDEX ix_sessions_sdk_session_id (sdk_session_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 所属プロジェクトID |
| name | VARCHAR(100) | YES | NULL | セッション名 |
| status | ENUM | NO | 'active' | ステータス |
| user_id | VARCHAR(36) | YES | NULL | 操作ユーザーID |
| model | VARCHAR(50) | NO | 'claude-opus-4-5' | 使用モデル |
| sdk_session_id | VARCHAR(100) | YES | NULL | Claude SDKセッションID（セッション再開用） |
| message_count | INTEGER | YES | 0 | メッセージ数 |
| total_tokens | INTEGER | YES | 0 | 合計トークン数 |
| total_cost_usd | FLOAT | YES | 0.0 | 合計コスト（USD） |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| last_activity_at | DATETIME | NO | CURRENT_TIMESTAMP | 最終アクティビティ日時 |

**セッションステータス遷移図:**

```mermaid
stateDiagram-v2
    [*] --> active: 作成
    active --> processing: メッセージ送信
    processing --> active: 応答完了
    processing --> active: 中断
    active --> idle: タイムアウト
    idle --> active: 再開
    active --> closed: 終了
    idle --> closed: 終了
    closed --> [*]
```

---

### 3.5 messages テーブル

メッセージ履歴を管理するテーブル。

```sql
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_messages_session_id (session_id),
    INDEX ix_messages_session_created (session_id, created_at),

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| session_id | VARCHAR(36) | NO | - | 所属セッションID |
| role | ENUM | NO | - | メッセージロール |
| content | TEXT | NO | - | メッセージ内容 |
| tokens | INTEGER | YES | NULL | トークン数 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

**ロール説明:**

| ロール | 説明 | 使用場面 |
|--------|------|---------|
| user | ユーザー入力 | ユーザーからの質問・指示 |
| assistant | AI応答 | Claudeからの応答 |
| system | システムメッセージ | ツール実行結果、エラー通知等 |

---

### 3.6 cron_logs テーブル

Cronジョブの実行ログを管理するテーブル。

```sql
CREATE TABLE cron_logs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at DATETIME NOT NULL,
    finished_at DATETIME,
    result TEXT,
    error TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_cron_logs_job_id (job_id),
    INDEX ix_cron_logs_job_created (job_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | INTEGER | NO | AUTO_INCREMENT | プライマリキー |
| job_id | VARCHAR(100) | NO | - | ジョブ識別子 |
| status | VARCHAR(20) | NO | - | 実行ステータス |
| started_at | DATETIME | NO | - | 開始日時 |
| finished_at | DATETIME | YES | NULL | 終了日時 |
| result | TEXT | YES | NULL | 実行結果 |
| error | TEXT | YES | NULL | エラー内容 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

**ステータス:**

| ステータス | 説明 |
|-----------|------|
| running | 実行中 |
| success | 成功 |
| error | エラー |
| timeout | タイムアウト |

---

### 3.7 project_mcp_servers テーブル

プロジェクトのMCPサーバー設定を管理するテーブル。

```sql
CREATE TABLE project_mcp_servers (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    command VARCHAR(500) NOT NULL,
    args JSON DEFAULT '[]',
    env JSON DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_tools JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_mcp_servers_project_name (project_id, name),
    INDEX ix_project_mcp_servers_project (project_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 所属プロジェクトID |
| name | VARCHAR(100) | NO | - | サーバー名（プロジェクト内一意） |
| command | VARCHAR(500) | NO | - | 実行コマンド |
| args | JSON | YES | '[]' | コマンド引数 |
| env | JSON | YES | '{}' | 環境変数 |
| enabled | BOOLEAN | NO | TRUE | 有効フラグ |
| enabled_tools | JSON | YES | NULL | 有効ツール一覧（NULL=全て） |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**JSONスキーマ例:**

```json
{
  "args": ["--port", "3000", "--verbose"],
  "env": {
    "NODE_ENV": "production",
    "API_KEY": "xxx"
  },
  "enabled_tools": ["read", "write", "search"]
}
```

---

### 3.8 project_agents テーブル

プロジェクトのエージェント設定を管理するテーブル。

```sql
CREATE TABLE project_agents (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    model VARCHAR(50) NOT NULL DEFAULT 'sonnet',
    tools JSON DEFAULT '[]',
    system_prompt TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_agents_project_name (project_id, name),
    INDEX ix_project_agents_project (project_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 所属プロジェクトID |
| name | VARCHAR(100) | NO | - | エージェント名（プロジェクト内一意） |
| description | VARCHAR(500) | YES | NULL | 説明 |
| category | VARCHAR(50) | NO | 'custom' | カテゴリ |
| model | VARCHAR(50) | NO | 'sonnet' | 使用モデル |
| tools | JSON | YES | '[]' | 使用可能ツール一覧 |
| system_prompt | TEXT | YES | NULL | システムプロンプト |
| enabled | BOOLEAN | NO | TRUE | 有効フラグ |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**カテゴリ一覧:**

| カテゴリ | 説明 |
|---------|------|
| custom | カスタムエージェント |
| development | 開発系エージェント |
| review | レビュー系エージェント |
| documentation | ドキュメント系エージェント |
| devops | DevOps系エージェント |

---

### 3.9 project_skills テーブル

プロジェクトのスキル設定を管理するテーブル。

```sql
CREATE TABLE project_skills (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    content TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_skills_project_name (project_id, name),
    INDEX ix_project_skills_project (project_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 所属プロジェクトID |
| name | VARCHAR(100) | NO | - | スキル名（プロジェクト内一意） |
| description | VARCHAR(500) | YES | NULL | 説明 |
| category | VARCHAR(50) | NO | 'custom' | カテゴリ |
| content | TEXT | YES | NULL | スキル定義（Markdown） |
| enabled | BOOLEAN | NO | TRUE | 有効フラグ |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### 3.10 project_commands テーブル

プロジェクトのコマンド設定を管理するテーブル。

```sql
CREATE TABLE project_commands (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    content TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_commands_project_name (project_id, name),
    INDEX ix_project_commands_project (project_id),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| project_id | VARCHAR(36) | NO | - | 所属プロジェクトID |
| name | VARCHAR(100) | NO | - | コマンド名（プロジェクト内一意） |
| description | VARCHAR(500) | YES | NULL | 説明 |
| category | VARCHAR(50) | NO | 'custom' | カテゴリ |
| content | TEXT | YES | NULL | コマンド定義（Markdown） |
| enabled | BOOLEAN | NO | TRUE | 有効フラグ |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### 3.11 project_templates テーブル

プロジェクトテンプレートを管理するテーブル。

```sql
CREATE TABLE project_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    mcp_servers JSON DEFAULT '[]',
    agents JSON DEFAULT '[]',
    skills JSON DEFAULT '[]',
    commands JSON DEFAULT '[]',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_project_templates_user (user_id),
    INDEX ix_project_templates_public (is_public),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| user_id | VARCHAR(36) | NO | - | オーナーユーザーID |
| name | VARCHAR(100) | NO | - | テンプレート名 |
| description | VARCHAR(500) | YES | NULL | 説明 |
| is_public | BOOLEAN | NO | FALSE | 公開フラグ |
| mcp_servers | JSON | YES | '[]' | MCPサーバー設定 |
| agents | JSON | YES | '[]' | エージェント設定 |
| skills | JSON | YES | '[]' | スキル設定 |
| commands | JSON | YES | '[]' | コマンド設定 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### 3.12 project_template_files テーブル

テンプレートに含まれるファイルを管理するテーブル。

```sql
CREATE TABLE project_template_files (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_template_files_template_path (template_id, file_path),
    INDEX ix_template_files_template (template_id),

    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | VARCHAR(36) | NO | - | UUID形式のプライマリキー |
| template_id | VARCHAR(36) | NO | - | 所属テンプレートID |
| file_path | VARCHAR(500) | NO | - | ファイルパス（テンプレート内一意） |
| content | TEXT | YES | NULL | ファイル内容 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 4. リレーションシップ

### 4.1 リレーション一覧

```mermaid
flowchart TD
    subgraph カーディナリティ
        A["1:N (One-to-Many)"]
        B["1:1 (One-to-One)"]
        C["N:M (Many-to-Many)"]
    end

    subgraph リレーション
        R1["users - projects<br/>1:N"]
        R2["projects - sessions<br/>1:N"]
        R3["sessions - messages<br/>1:N"]
        R4["projects - project_shares<br/>1:N"]
        R5["users - project_shares<br/>N:M (through)"]
        R6["projects - project_mcp_servers<br/>1:N"]
        R7["projects - project_agents<br/>1:N"]
        R8["projects - project_skills<br/>1:N"]
        R9["projects - project_commands<br/>1:N"]
        R10["users - project_templates<br/>1:N"]
        R11["project_templates - project_template_files<br/>1:N"]
    end
```

### 4.2 外部キー制約

| 親テーブル | 子テーブル | 外部キー | ON DELETE |
|-----------|-----------|---------|-----------|
| users | projects | user_id | SET NULL |
| users | project_shares | user_id | CASCADE |
| users | project_shares | shared_by | SET NULL |
| users | project_templates | user_id | CASCADE |
| projects | sessions | project_id | CASCADE |
| projects | project_shares | project_id | CASCADE |
| projects | project_mcp_servers | project_id | CASCADE |
| projects | project_agents | project_id | CASCADE |
| projects | project_skills | project_id | CASCADE |
| projects | project_commands | project_id | CASCADE |
| sessions | messages | session_id | CASCADE |
| project_templates | project_template_files | template_id | CASCADE |

### 4.3 カスケード削除フロー

```mermaid
flowchart TD
    subgraph ユーザー削除時
        U[User削除] --> P1[所有Projects.user_id = NULL]
        U --> PS1[ProjectShares削除]
        U --> PS2[shared_by = NULL]
        U --> T[Templates削除]
        T --> TF[TemplateFiles削除]
    end

    subgraph プロジェクト削除時
        P[Project削除] --> S[Sessions削除]
        S --> M[Messages削除]
        P --> PS3[ProjectShares削除]
        P --> MCP[MCPServers削除]
        P --> A[Agents削除]
        P --> SK[Skills削除]
        P --> C[Commands削除]
    end
```

---

## 5. データフロー

### 5.1 プロジェクト作成フロー

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant API as FastAPI
    participant Service as ProjectService
    participant DB as MySQL
    participant FS as FileSystem

    Client->>API: POST /api/projects
    API->>Service: create_project()
    Service->>DB: BEGIN TRANSACTION
    Service->>DB: INSERT INTO projects
    Service->>FS: mkdir workspace/{project_id}
    Service->>DB: COMMIT
    Service-->>API: Project
    API-->>Client: 201 Created
```

### 5.2 チャットメッセージフロー

```mermaid
sequenceDiagram
    participant WS as WebSocket
    participant Handler as WSHandler
    participant Service as ChatService
    participant DB as MySQL
    participant Claude as Claude API

    WS->>Handler: message
    Handler->>Service: send_message()
    Service->>DB: INSERT INTO messages (user)
    Service->>Claude: query()

    loop Streaming
        Claude-->>Service: chunk
        Service-->>Handler: stream_message
        Handler-->>WS: text/tool_use
    end

    Service->>DB: INSERT INTO messages (assistant)
    Service->>DB: UPDATE sessions (token_count, cost)
    Service-->>Handler: result
    Handler-->>WS: result
```

### 5.3 セッション再開フロー

Claude Agent SDKのセッション再開機能を使用して、ブラウザ更新後も会話履歴を維持します。

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant WS as WebSocket Handler
    participant DB as MySQL
    participant SDK as Claude Agent SDK

    Note over Client,SDK: 初回接続時
    Client->>WS: WebSocket接続 + メッセージ送信
    WS->>DB: SELECT sdk_session_id FROM sessions WHERE id = ?
    DB-->>WS: NULL (新規セッション)
    WS->>SDK: ClaudeAgentOptions(resume=None)
    SDK-->>WS: 応答 + session_id
    WS->>DB: UPDATE sessions SET sdk_session_id = ?

    Note over Client,SDK: 再接続時（ブラウザ更新後）
    Client->>WS: WebSocket接続 + メッセージ送信
    WS->>DB: SELECT sdk_session_id FROM sessions WHERE id = ?
    DB-->>WS: "sdk_session_xxx" (既存セッションID)
    WS->>SDK: ClaudeAgentOptions(resume="sdk_session_xxx")
    Note over SDK: 前回の会話コンテキストを復元
    SDK-->>WS: 応答（履歴を考慮）
```

**セッションID管理:**

| 操作 | 説明 |
|------|------|
| 初回接続 | SDK session_id が NULL、新規セッション作成 |
| メッセージ送信後 | SDK から返された session_id を DB に保存 |
| 再接続時 | DB から sdk_session_id を取得し、SDK の resume パラメータに渡す |
| セッション終了 | sdk_session_id は保持（将来の再開に備える） |

### 5.4 プロジェクト設定読み込みフロー

```mermaid
sequenceDiagram
    participant Handler as WSHandler
    participant Service as ProjectConfigService
    participant DB as MySQL
    participant SDK as Claude SDK

    Handler->>Service: get_project_config(project_id)

    par 並列取得
        Service->>DB: SELECT * FROM project_mcp_servers
        Service->>DB: SELECT * FROM project_agents
        Service->>DB: SELECT * FROM project_skills
        Service->>DB: SELECT * FROM project_commands
    end

    Service-->>Handler: ProjectConfig
    Handler->>SDK: ClaudeAgentOptions(config)
    SDK-->>Handler: Agent ready
```

### 5.5 テンプレート適用フロー

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant API as FastAPI
    participant Service as TemplateService
    participant DB as MySQL
    participant FS as FileSystem

    Client->>API: POST /api/projects/{id}/apply-template
    API->>Service: apply_template()
    Service->>DB: SELECT * FROM project_templates
    Service->>DB: SELECT * FROM project_template_files

    Service->>DB: BEGIN TRANSACTION
    Service->>DB: INSERT INTO project_mcp_servers
    Service->>DB: INSERT INTO project_agents
    Service->>DB: INSERT INTO project_skills
    Service->>DB: INSERT INTO project_commands

    loop ファイル作成
        Service->>FS: write(workspace/{project_id}/{file_path})
    end

    Service->>DB: COMMIT
    Service-->>API: Success
    API-->>Client: 200 OK
```

---

## 6. インデックス設計

### 6.1 インデックス一覧

```mermaid
flowchart LR
    subgraph Primary["主キーインデックス"]
        PK1["users.id"]
        PK2["projects.id"]
        PK3["sessions.id"]
        PK4["messages.id"]
    end

    subgraph Unique["ユニークインデックス"]
        UK1["users.email"]
        UK2["project_shares(project_id, user_id)"]
        UK3["project_mcp_servers(project_id, name)"]
        UK4["project_agents(project_id, name)"]
        UK5["project_skills(project_id, name)"]
        UK6["project_commands(project_id, name)"]
        UK7["project_template_files(template_id, file_path)"]
    end

    subgraph Secondary["セカンダリインデックス"]
        IX1["projects.user_id"]
        IX2["projects(user_id, status)"]
        IX3["sessions.project_id"]
        IX4["sessions(project_id, status)"]
        IX5["sessions.last_activity_at"]
        IX6["messages.session_id"]
        IX7["messages(session_id, created_at)"]
    end
```

### 6.2 インデックス詳細

| テーブル | インデックス名 | カラム | 種別 | 用途 |
|---------|--------------|--------|------|------|
| users | PRIMARY | id | PK | 主キー |
| users | ix_users_email | email | UNIQUE | ログイン検索 |
| projects | PRIMARY | id | PK | 主キー |
| projects | ix_projects_user_id | user_id | INDEX | ユーザー別一覧 |
| projects | ix_projects_user_status | user_id, status | COMPOSITE | ステータス別一覧 |
| sessions | PRIMARY | id | PK | 主キー |
| sessions | ix_sessions_project_id | project_id | INDEX | プロジェクト別一覧 |
| sessions | ix_sessions_project_status | project_id, status | COMPOSITE | ステータス別一覧 |
| sessions | ix_sessions_last_activity | last_activity_at | INDEX | アクティビティ順 |
| sessions | ix_sessions_sdk_session_id | sdk_session_id | INDEX | SDK セッションID検索 |
| messages | PRIMARY | id | PK | 主キー |
| messages | ix_messages_session_id | session_id | INDEX | セッション別一覧 |
| messages | ix_messages_session_created | session_id, created_at | COMPOSITE | 時系列取得 |
| cron_logs | PRIMARY | id | PK | 主キー |
| cron_logs | ix_cron_logs_job_id | job_id | INDEX | ジョブ別検索 |
| cron_logs | ix_cron_logs_job_created | job_id, created_at | COMPOSITE | ジョブ別時系列 |

### 6.3 クエリパターンとインデックス活用

```mermaid
flowchart TD
    subgraph 頻出クエリ
        Q1["ユーザー別プロジェクト一覧<br/>WHERE user_id = ? AND status = 'active'<br/>ORDER BY updated_at DESC"]
        Q2["プロジェクト別セッション一覧<br/>WHERE project_id = ?<br/>ORDER BY last_activity_at DESC"]
        Q3["セッション別メッセージ履歴<br/>WHERE session_id = ?<br/>ORDER BY created_at ASC"]
        Q4["アクティブセッション検索<br/>WHERE last_activity_at > ?"]
    end

    subgraph 使用インデックス
        I1["ix_projects_user_status"]
        I2["ix_sessions_project_id + ix_sessions_last_activity"]
        I3["ix_messages_session_created"]
        I4["ix_sessions_last_activity"]
    end

    Q1 --> I1
    Q2 --> I2
    Q3 --> I3
    Q4 --> I4
```

---

## 7. セキュリティ考慮事項

### 7.1 データ保護

```mermaid
flowchart TD
    subgraph 機密データ
        PWD["パスワード<br/>bcryptハッシュ化"]
        API["APIキー<br/>暗号化推奨"]
        TOKEN["トークン<br/>JWT署名"]
    end

    subgraph アクセス制御
        AUTH["認証<br/>FastAPI-Users"]
        AUTHZ["認可<br/>権限レベル"]
        ROW["行レベルセキュリティ<br/>user_id検証"]
    end

    subgraph 監査
        LOG["操作ログ<br/>cron_logs"]
        AUDIT["変更追跡<br/>updated_at"]
    end
```

### 7.2 セキュリティチェックリスト

| 項目 | 対策 | 実装状況 |
|------|------|---------|
| パスワード保存 | bcryptハッシュ化 | 実装済み |
| SQLインジェクション | SQLAlchemy ORM使用 | 実装済み |
| APIキー保護 | 環境変数管理 | 実装済み |
| セッション管理 | JWT + 有効期限 | 実装済み |
| アクセス制御 | 権限レベル検証 | 実装済み |
| データ暗号化 | TLS通信 | 運用設定 |
| 監査ログ | 操作ログ記録 | 部分実装 |

### 7.3 権限モデル

```mermaid
flowchart TD
    subgraph ユーザー種別
        SUPER["superuser<br/>システム管理者"]
        OWNER["owner<br/>プロジェクトオーナー"]
        ADMIN["admin<br/>プロジェクト管理者"]
        WRITE["write<br/>編集者"]
        READ["read<br/>閲覧者"]
    end

    subgraph 操作権限
        OP1["システム設定"]
        OP2["プロジェクト作成/削除"]
        OP3["共有設定管理"]
        OP4["セッション操作"]
        OP5["閲覧のみ"]
    end

    SUPER --> OP1
    SUPER --> OP2
    OWNER --> OP2
    OWNER --> OP3
    ADMIN --> OP3
    ADMIN --> OP4
    WRITE --> OP4
    READ --> OP5
```

### 7.4 データマスキング

```python
# 機密データのマスキング例
class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    # hashed_password は含めない
    is_active: bool
    created_at: datetime
```

---

## 8. マイグレーション戦略

### 8.1 マイグレーションツール

```mermaid
flowchart LR
    subgraph ツール
        Alembic["Alembic<br/>SQLAlchemy公式"]
    end

    subgraph ワークフロー
        DEV["開発環境"] --> |マイグレーション作成| STG["ステージング"]
        STG --> |検証| PROD["本番環境"]
    end

    Alembic --> ワークフロー
```

### 8.2 マイグレーション手順

```bash
# 1. マイグレーション作成
alembic revision --autogenerate -m "add_new_column"

# 2. マイグレーション確認
alembic history

# 3. マイグレーション適用（ステージング）
alembic upgrade head

# 4. ロールバック（必要時）
alembic downgrade -1
```

### 8.3 マイグレーション例

```python
# alembic/versions/xxxx_add_cost_limits.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('projects',
        sa.Column('cost_limit_daily', sa.Float(), nullable=True))
    op.add_column('projects',
        sa.Column('cost_limit_weekly', sa.Float(), nullable=True))
    op.add_column('projects',
        sa.Column('cost_limit_monthly', sa.Float(), nullable=True))

def downgrade():
    op.drop_column('projects', 'cost_limit_monthly')
    op.drop_column('projects', 'cost_limit_weekly')
    op.drop_column('projects', 'cost_limit_daily')
```

### 8.4 マイグレーションベストプラクティス

```mermaid
flowchart TD
    subgraph ベストプラクティス
        BP1["1. 小さな変更を頻繁に"]
        BP2["2. ダウンタイムなし移行"]
        BP3["3. ロールバック可能"]
        BP4["4. データバックアップ"]
        BP5["5. 本番前テスト"]
    end

    subgraph ダウンタイムなし移行
        A["新カラム追加（NULL許容）"]
        B["アプリケーション更新"]
        C["データ移行"]
        D["NOT NULL制約追加"]
    end

    A --> B --> C --> D
```

---

## 9. パフォーマンス最適化

### 9.1 クエリ最適化

```mermaid
flowchart TD
    subgraph 最適化戦略
        OPT1["インデックス活用"]
        OPT2["N+1問題回避"]
        OPT3["ページネーション"]
        OPT4["キャッシュ活用"]
    end

    subgraph 実装
        IMP1["複合インデックス設計"]
        IMP2["joinedload/selectinload"]
        IMP3["LIMIT/OFFSET"]
        IMP4["Redis キャッシュ"]
    end

    OPT1 --> IMP1
    OPT2 --> IMP2
    OPT3 --> IMP3
    OPT4 --> IMP4
```

### 9.2 N+1問題の回避

```python
# 悪い例: N+1問題
sessions = db.query(Session).filter_by(project_id=project_id).all()
for session in sessions:
    messages = session.messages  # N回のクエリ発行

# 良い例: Eager Loading
from sqlalchemy.orm import joinedload

sessions = db.query(Session)\
    .options(joinedload(Session.messages))\
    .filter_by(project_id=project_id)\
    .all()
```

### 9.3 パーティショニング検討

```mermaid
flowchart TD
    subgraph パーティション対象
        MSG["messages テーブル<br/>created_at でパーティション"]
        LOG["cron_logs テーブル<br/>created_at でパーティション"]
    end

    subgraph パーティション戦略
        P1["月次パーティション"]
        P2["古いパーティション削除"]
        P3["パーティションプルーニング"]
    end

    MSG --> P1
    LOG --> P1
    P1 --> P2
    P1 --> P3
```

### 9.4 接続プール設定

```python
# config.py
from sqlalchemy.pool import QueuePool

DATABASE_URL = "mysql+pymysql://user:pass@host/db"

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,           # 通常接続数
    max_overflow=20,        # 最大追加接続数
    pool_timeout=30,        # 接続待機タイムアウト
    pool_recycle=1800,      # 接続リサイクル時間
    pool_pre_ping=True      # 接続ヘルスチェック
)
```

### 9.5 キャッシュ戦略

```mermaid
flowchart LR
    subgraph キャッシュ層
        L1["L1: アプリケーション<br/>lru_cache"]
        L2["L2: Redis<br/>セッション・設定"]
        L3["L3: MySQL<br/>クエリキャッシュ"]
    end

    L1 --> L2 --> L3

    subgraph キャッシュ対象
        C1["プロジェクト設定"]
        C2["ユーザー情報"]
        C3["テンプレート"]
    end
```

---

## 10. 運用ガイドライン

### 10.1 バックアップ戦略

```mermaid
flowchart TD
    subgraph バックアップ種別
        FULL["フルバックアップ<br/>日次"]
        INCR["増分バックアップ<br/>時間ごと"]
        BINLOG["バイナリログ<br/>継続的"]
    end

    subgraph 保持期間
        D7["7日間: フル"]
        D1["1日間: 増分"]
        D3["3日間: バイナリログ"]
    end

    FULL --> D7
    INCR --> D1
    BINLOG --> D3
```

### 10.2 監視項目

| 監視項目 | 閾値 | アラート |
|---------|------|---------|
| 接続数 | > 80% | Warning |
| スロークエリ | > 1秒 | Warning |
| ディスク使用率 | > 80% | Critical |
| レプリケーション遅延 | > 30秒 | Critical |
| テーブルロック待機 | > 10秒 | Warning |

### 10.3 メンテナンスタスク

```mermaid
flowchart LR
    subgraph 日次
        D1["バックアップ"]
        D2["スロークエリ分析"]
    end

    subgraph 週次
        W1["OPTIMIZE TABLE"]
        W2["インデックス統計更新"]
    end

    subgraph 月次
        M1["古いデータアーカイブ"]
        M2["パフォーマンスレビュー"]
    end
```

### 10.4 データ保持ポリシー

| データ種別 | 保持期間 | アーカイブ |
|-----------|---------|-----------|
| ユーザー | 無期限 | - |
| プロジェクト | 削除後90日 | S3 |
| セッション | 最終アクセスから30日 | S3 |
| メッセージ | セッションに依存 | S3 |
| Cronログ | 90日 | 削除 |
| テンプレート | 無期限 | - |

### 10.5 トラブルシューティング

```mermaid
flowchart TD
    subgraph 問題
        P1["接続エラー"]
        P2["スロークエリ"]
        P3["デッドロック"]
        P4["ディスク不足"]
    end

    subgraph 対応
        A1["接続プール設定確認"]
        A2["EXPLAIN分析"]
        A3["トランザクション見直し"]
        A4["パーティション削除"]
    end

    P1 --> A1
    P2 --> A2
    P3 --> A3
    P4 --> A4
```

---

## 付録

### A. DDL一括出力

```sql
-- 全テーブル作成SQL
-- 詳細は各セクション参照

-- 実行順序:
-- 1. users
-- 2. projects
-- 3. project_shares
-- 4. sessions
-- 5. messages
-- 6. cron_logs
-- 7. project_mcp_servers
-- 8. project_agents
-- 9. project_skills
-- 10. project_commands
-- 11. project_templates
-- 12. project_template_files
```

### B. SQLAlchemyモデル参照

```python
# src/backend/app/models/database.py
# 全モデル定義はこのファイルを参照
```

### C. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| アーキテクチャ設計書 | doc/architecture-design.md | システム全体設計 |
| バックエンド設計書 | doc/backend-design.md | API設計詳細 |
| 認証設計書 | doc/authentication-design.md | 認証・認可設計 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-29 | 初版作成 |
| v1.1 | 2025-12-29 | テーブル形式に統一（変更履歴、管理情報） |
| v1.2 | 2025-12-30 | sessions テーブルに sdk_session_id カラムを追加（セッション再開機能対応） |
| v1.3 | 2026-01-02 | 目次を詳細化（サブセクションリンク追加、付録・変更履歴を追加） |

---

**ドキュメント管理情報**

| 項目 | 値 |
|------|-----|
| 設計書バージョン | 1.3 |
| 最終更新 | 2026-01-02 |
| 作成者 | Claude Code |
| レビューステータス | ✅ 完了 |
| 完成度 | 100% |
