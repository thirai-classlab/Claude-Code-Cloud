-- Project Template Tables Migration
-- プロジェクトテンプレート機能用テーブル作成

-- ============================================
-- project_templates テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    mcp_servers JSON,
    agents JSON,
    skills JSON,
    commands JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes
    INDEX ix_project_templates_user (user_id),
    INDEX ix_project_templates_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- project_template_files テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS project_template_files (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content LONGTEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_template_files_template FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE,

    -- Unique Constraints
    CONSTRAINT uq_template_files_template_path UNIQUE (template_id, file_path),

    -- Indexes
    INDEX ix_template_files_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
