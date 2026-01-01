-- ============================================
-- Initial Schema Migration
-- Description: 全テーブルの初期作成
-- Date: 2025-01-02
-- ============================================

-- ============================================
-- users テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NULL,
    is_active INT NOT NULL DEFAULT 1,
    is_superuser INT NOT NULL DEFAULT 0,
    is_verified INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- projects テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    user_id VARCHAR(36) NULL,
    status ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active',
    workspace_path VARCHAR(500) NULL,
    session_count INT NOT NULL DEFAULT 0,
    api_key VARCHAR(500) NULL,
    cost_limit_daily FLOAT NULL COMMENT '過去1日の利用制限（USD）',
    cost_limit_weekly FLOAT NULL COMMENT '過去7日の利用制限（USD）',
    cost_limit_monthly FLOAT NULL COMMENT '過去30日の利用制限（USD）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_projects_user_id (user_id),
    INDEX ix_projects_user_status (user_id, status),
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_shares テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_shares (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission_level ENUM('read', 'write', 'admin') NOT NULL DEFAULT 'read',
    shared_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_shares_project_user (project_id, user_id),
    INDEX ix_project_shares_project_user (project_id, user_id),
    INDEX ix_project_shares_user_id (user_id),
    CONSTRAINT fk_project_shares_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_shares_sharer FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- sessions テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NULL,
    status ENUM('active', 'idle', 'processing', 'closed') NOT NULL DEFAULT 'active',
    user_id VARCHAR(36) NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    sdk_session_id VARCHAR(100) NULL,
    message_count INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    total_cost_usd FLOAT NOT NULL DEFAULT 0.0,
    is_processing BOOLEAN NOT NULL DEFAULT FALSE,
    processing_started_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_sessions_project_id (project_id),
    INDEX ix_sessions_user_id (user_id),
    INDEX ix_sessions_sdk_session_id (sdk_session_id),
    INDEX ix_sessions_project_status (project_id, status),
    INDEX ix_sessions_last_activity (last_activity_at),
    INDEX ix_sessions_is_processing (is_processing, processing_started_at),
    CONSTRAINT fk_sessions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- messages テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content LONGTEXT NOT NULL,
    tokens INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_messages_session_id (session_id),
    INDEX ix_messages_session_created (session_id, created_at),
    CONSTRAINT fk_messages_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- cron_logs テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS cron_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    result TEXT NULL,
    error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_cron_logs_job_id (job_id),
    INDEX ix_cron_logs_job_created (job_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_mcp_servers テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_mcp_servers (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    command VARCHAR(500) NOT NULL,
    args JSON DEFAULT NULL,
    env JSON DEFAULT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_tools JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_mcp_servers_project_name (project_id, name),
    INDEX ix_project_mcp_servers_project (project_id),
    CONSTRAINT fk_project_mcp_servers_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_agents テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_agents (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    model VARCHAR(50) NOT NULL DEFAULT 'sonnet',
    tools JSON DEFAULT NULL,
    system_prompt TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_agents_project_name (project_id, name),
    INDEX ix_project_agents_project (project_id),
    CONSTRAINT fk_project_agents_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_skills テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_skills (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    content TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_skills_project_name (project_id, name),
    INDEX ix_project_skills_project (project_id),
    CONSTRAINT fk_project_skills_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_commands テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_commands (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    content TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_project_commands_project_name (project_id, name),
    INDEX ix_project_commands_project (project_id),
    CONSTRAINT fk_project_commands_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_templates テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    mcp_servers JSON DEFAULT NULL,
    agents JSON DEFAULT NULL,
    skills JSON DEFAULT NULL,
    commands JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_project_templates_user (user_id),
    INDEX ix_project_templates_public (is_public),
    CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_template_files テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_template_files (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_template_files_template_path (template_id, file_path),
    INDEX ix_template_files_template (template_id),
    CONSTRAINT fk_template_files_template FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
