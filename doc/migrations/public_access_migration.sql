-- Public Access Feature Migration
-- プロジェクト外部公開機能のためのデータベースマイグレーション
-- 実行日: 2026-01-01

-- ============================================
-- 1. プロジェクト外部公開設定テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_public_access (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL UNIQUE,
    access_token VARCHAR(64) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255) NULL,
    allowed_ips JSON NULL,
    max_sessions_per_day INT NULL,
    max_messages_per_session INT NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_public_access_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    INDEX idx_public_access_token (access_token),
    INDEX idx_public_access_project (project_id),
    INDEX idx_public_access_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. コマンド公開設定テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS command_public_settings (
    id VARCHAR(36) PRIMARY KEY,
    command_id VARCHAR(36) NOT NULL UNIQUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    priority INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_command_public_command
        FOREIGN KEY (command_id)
        REFERENCES project_commands(id)
        ON DELETE CASCADE,

    INDEX idx_command_public_command (command_id),
    INDEX idx_command_public_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. 外部公開セッションテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public_sessions (
    id VARCHAR(36) PRIMARY KEY,
    public_access_id VARCHAR(36) NOT NULL,
    command_id VARCHAR(36) NULL,
    sdk_session_id VARCHAR(255) NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    message_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_public_session_access
        FOREIGN KEY (public_access_id)
        REFERENCES project_public_access(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_public_session_command
        FOREIGN KEY (command_id)
        REFERENCES project_commands(id)
        ON DELETE SET NULL,

    INDEX idx_public_session_access (public_access_id),
    INDEX idx_public_session_command (command_id),
    INDEX idx_public_session_created (created_at),
    INDEX idx_public_session_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 確認クエリ
-- ============================================
-- テーブル確認
-- SHOW TABLES LIKE '%public%';
-- DESCRIBE project_public_access;
-- DESCRIBE command_public_settings;
-- DESCRIBE public_sessions;
