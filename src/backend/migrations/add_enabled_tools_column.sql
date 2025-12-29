-- Migration: Add enabled_tools column to project_mcp_servers table
-- Date: 2025-01-XX
-- Description: MCPサーバーの有効化されたツールのリストを管理するカラムを追加

-- Add enabled_tools column (JSON type, nullable)
-- null = all tools enabled
-- List[str] = only specified tools are enabled
ALTER TABLE project_mcp_servers
ADD COLUMN enabled_tools JSON DEFAULT NULL AFTER enabled;

-- Verify the change
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'project_mcp_servers' AND COLUMN_NAME = 'enabled_tools';
