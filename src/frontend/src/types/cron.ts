/**
 * Cron Schedule Types
 *
 * Cronスケジュール管理のための型定義
 */

/**
 * Cronスケジュールの基本構造
 */
export interface CronSchedule {
  command: string;
  cron: string;
  description: string;
  enabled: boolean;
  timezone: string;
  args: Record<string, unknown>;
}

/**
 * Cronスケジュール（名前付き）
 */
export interface CronScheduleWithName extends CronSchedule {
  name: string;
  next_run?: string | null;
}

/**
 * Cron設定ファイル構造
 */
export interface CronConfig {
  schedules: Record<string, CronSchedule>;
  version: string;
}

/**
 * スケジュール作成リクエスト
 */
export interface CronScheduleCreateRequest {
  name: string;
  command: string;
  cron: string;
  description?: string;
  enabled?: boolean;
  timezone?: string;
  args?: Record<string, unknown>;
}

/**
 * スケジュール更新リクエスト
 */
export interface CronScheduleUpdateRequest {
  command?: string;
  cron?: string;
  description?: string;
  enabled?: boolean;
  timezone?: string;
  args?: Record<string, unknown>;
}

/**
 * スケジュールレスポンス
 */
export interface CronScheduleResponse {
  name: string;
  command: string;
  cron: string;
  description: string;
  enabled: boolean;
  timezone: string;
  next_run: string | null;
}

/**
 * Cron設定レスポンス
 */
export interface CronConfigResponse {
  schedules: CronScheduleResponse[];
  path: string;
}

/**
 * 実行ログレスポンス
 */
export interface CronExecutionLog {
  schedule_name: string;
  command: string;
  project_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  result: string | null;
  error: string | null;
}

/**
 * Cronプリセット
 */
export interface CronPreset {
  name: string;
  cron: string;
  description: string;
}

/**
 * よく使うCronプリセット
 */
export const CRON_PRESETS: CronPreset[] = [
  { name: 'every_minute', cron: '* * * * *', description: '毎分' },
  { name: 'every_5_minutes', cron: '*/5 * * * *', description: '5分ごと' },
  { name: 'every_15_minutes', cron: '*/15 * * * *', description: '15分ごと' },
  { name: 'every_30_minutes', cron: '*/30 * * * *', description: '30分ごと' },
  { name: 'hourly', cron: '0 * * * *', description: '毎時0分' },
  { name: 'daily_midnight', cron: '0 0 * * *', description: '毎日0:00' },
  { name: 'daily_9am', cron: '0 9 * * *', description: '毎日9:00' },
  { name: 'daily_6pm', cron: '0 18 * * *', description: '毎日18:00' },
  { name: 'weekly_monday', cron: '0 9 * * 1', description: '毎週月曜9:00' },
  { name: 'weekly_friday', cron: '0 17 * * 5', description: '毎週金曜17:00' },
  { name: 'monthly_1st', cron: '0 0 1 * *', description: '毎月1日0:00' },
];

/**
 * タイムゾーン一覧
 */
export const TIMEZONES = [
  'Asia/Tokyo',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
] as const;

export type Timezone = typeof TIMEZONES[number];
