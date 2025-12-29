import { Session } from './session';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  session_count: number;
  workspace_path: string;
  api_key?: string;
  // 利用制限設定（USD単位、nullは無制限）
  cost_limit_daily?: number | null;
  cost_limit_weekly?: number | null;
  cost_limit_monthly?: number | null;
}

export interface ProjectWithSessions extends Project {
  sessions: Session[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  api_key?: string;
}

/** 使用量統計 */
export interface UsageStats {
  project_id: string;
  total_tokens: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  session_count: number;
  message_count: number;
  // 期間別使用量
  cost_daily: number;
  cost_weekly: number;
  cost_monthly: number;
}

/** 利用制限チェック結果 */
export interface CostLimitCheck {
  project_id: string;
  can_use: boolean;
  exceeded_limits: string[];
  // 現在の使用量
  cost_daily: number;
  cost_weekly: number;
  cost_monthly: number;
  // 制限値
  limit_daily: number | null;
  limit_weekly: number | null;
  limit_monthly: number | null;
}

/** 利用制限更新リクエスト */
export interface CostLimitUpdateRequest {
  cost_limit_daily?: number | null;
  cost_limit_weekly?: number | null;
  cost_limit_monthly?: number | null;
}
