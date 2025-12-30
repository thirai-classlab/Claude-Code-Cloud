-- Migration: Add processing state columns to sessions table
-- Description: セッションの処理状態を永続化してストリーム再開を可能にする
-- Date: 2025-12-30

-- Add is_processing column
ALTER TABLE sessions
ADD COLUMN is_processing BOOLEAN NOT NULL DEFAULT FALSE;

-- Add processing_started_at column
ALTER TABLE sessions
ADD COLUMN processing_started_at DATETIME NULL;

-- Add index for finding processing sessions (for timeout cleanup)
CREATE INDEX ix_sessions_is_processing ON sessions (is_processing, processing_started_at);

-- Rollback:
-- ALTER TABLE sessions DROP COLUMN is_processing;
-- ALTER TABLE sessions DROP COLUMN processing_started_at;
-- DROP INDEX ix_sessions_is_processing ON sessions;
