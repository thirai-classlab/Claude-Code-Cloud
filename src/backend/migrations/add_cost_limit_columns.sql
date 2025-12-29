-- Migration: Add cost limit columns to projects table
-- Description: 利用制限設定カラムを追加（過去1日/7日/30日）

-- Add cost limit columns
ALTER TABLE projects
ADD COLUMN cost_limit_daily FLOAT NULL COMMENT '過去1日の利用制限（USD）',
ADD COLUMN cost_limit_weekly FLOAT NULL COMMENT '過去7日の利用制限（USD）',
ADD COLUMN cost_limit_monthly FLOAT NULL COMMENT '過去30日の利用制限（USD）';

-- Note: NULL values mean no limit is set
