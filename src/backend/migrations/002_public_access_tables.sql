-- ============================================
-- Public Access Tables Migration
-- Description: 外部公開機能用テーブル作成
-- Date: 2025-01-02
-- Depends on: 001_initial_schema.sql
-- ============================================

-- ============================================
-- project_public_access テーブル
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

    INDEX ix_project_public_access_project (project_id),
    INDEX ix_project_public_access_token (access_token),
    CONSTRAINT fk_public_access_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- command_public_settings テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS command_public_settings (
    id VARCHAR(36) PRIMARY KEY,
    command_id VARCHAR(36) NOT NULL UNIQUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    priority INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_command_public_settings_command (command_id),
    CONSTRAINT fk_command_public_settings_command FOREIGN KEY (command_id) REFERENCES project_commands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- public_sessions テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public_sessions (
    id VARCHAR(36) PRIMARY KEY,
    public_access_id VARCHAR(36) NOT NULL,
    command_id VARCHAR(36) NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500) NULL,
    message_count INT NOT NULL DEFAULT 0,
    sdk_session_id VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_public_sessions_public_access (public_access_id),
    INDEX ix_public_sessions_sdk_session_id (sdk_session_id),
    INDEX ix_public_sessions_created (created_at),
    CONSTRAINT fk_public_sessions_public_access FOREIGN KEY (public_access_id) REFERENCES project_public_access(id) ON DELETE CASCADE,
    CONSTRAINT fk_public_sessions_command FOREIGN KEY (command_id) REFERENCES project_commands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
