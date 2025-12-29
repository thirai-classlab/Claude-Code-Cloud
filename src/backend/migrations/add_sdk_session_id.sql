-- Migration: Add sdk_session_id column to sessions table
-- Date: 2025-12-30
-- Description: Add SDK session ID for Claude Agent SDK session resume functionality

-- Check if column exists before adding
SET @columnExists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sessions'
    AND COLUMN_NAME = 'sdk_session_id'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE sessions ADD COLUMN sdk_session_id VARCHAR(100) NULL AFTER model',
    'SELECT "Column sdk_session_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for faster lookups
SET @indexExists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sessions'
    AND INDEX_NAME = 'ix_sessions_sdk_session_id'
);

SET @sql = IF(@indexExists = 0,
    'CREATE INDEX ix_sessions_sdk_session_id ON sessions(sdk_session_id)',
    'SELECT "Index ix_sessions_sdk_session_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
