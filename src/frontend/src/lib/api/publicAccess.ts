/**
 * Public Access API Client
 *
 * 外部公開機能のAPIクライアント
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface PublicAccessSettings {
  id: string;
  project_id: string;
  access_token: string;
  enabled: boolean;
  has_password: boolean;
  allowed_ips: string[] | null;
  max_sessions_per_day: number | null;
  max_messages_per_session: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  public_url: string;
}

export interface PublicAccessCreate {
  enabled?: boolean;
  password?: string;
  allowed_ips?: string[];
  max_sessions_per_day?: number;
  max_messages_per_session?: number;
  expires_at?: string;
}

export interface PublicAccessUpdate {
  enabled?: boolean;
  password?: string;
  clear_password?: boolean;
  allowed_ips?: string[];
  max_sessions_per_day?: number;
  max_messages_per_session?: number;
  expires_at?: string;
  clear_expires_at?: boolean;
}

export interface CommandPublicSetting {
  command_id: string;
  command_name: string;
  command_description: string | null;
  is_public: boolean;
  priority: number;
}

export interface CommandPublicSettingList {
  commands: CommandPublicSetting[];
  total: number;
}

export interface PublicSession {
  id: string;
  command_id: string | null;
  command_name: string | null;
  ip_address: string;
  user_agent: string | null;
  message_count: number;
  created_at: string;
  last_activity_at: string;
}

export interface PublicSessionList {
  sessions: PublicSession[];
  total: number;
}

export interface PublicAccessStats {
  total_sessions: number;
  today_sessions: number;
  total_messages: number;
  unique_ips: number;
}

// ============================================
// Admin API (認証必須)
// ============================================

/**
 * 外部公開設定を取得
 */
export async function getPublicAccess(projectId: string): Promise<PublicAccessSettings> {
  return apiClient.get<PublicAccessSettings>(`/api/projects/${projectId}/public-access`);
}

/**
 * 外部公開設定を作成
 */
export async function createPublicAccess(
  projectId: string,
  data: PublicAccessCreate
): Promise<PublicAccessSettings> {
  return apiClient.post<PublicAccessSettings>(`/api/projects/${projectId}/public-access`, data);
}

/**
 * 外部公開設定を更新
 */
export async function updatePublicAccess(
  projectId: string,
  data: PublicAccessUpdate
): Promise<PublicAccessSettings> {
  return apiClient.put<PublicAccessSettings>(`/api/projects/${projectId}/public-access`, data);
}

/**
 * 外部公開設定を削除
 */
export async function deletePublicAccess(projectId: string): Promise<void> {
  return apiClient.delete(`/api/projects/${projectId}/public-access`);
}

/**
 * アクセストークンを再生成
 */
export async function regenerateToken(projectId: string): Promise<PublicAccessSettings> {
  return apiClient.post<PublicAccessSettings>(
    `/api/projects/${projectId}/public-access/regenerate-token`
  );
}

/**
 * コマンド公開設定一覧を取得
 */
export async function getCommandPublicSettings(
  projectId: string
): Promise<CommandPublicSettingList> {
  return apiClient.get<CommandPublicSettingList>(
    `/api/projects/${projectId}/commands/public-settings`
  );
}

/**
 * コマンド公開設定を更新
 */
export async function updateCommandPublicSetting(
  projectId: string,
  commandId: string,
  data: { is_public: boolean; priority: number }
): Promise<CommandPublicSetting> {
  return apiClient.put<CommandPublicSetting>(
    `/api/projects/${projectId}/commands/${commandId}/public-setting`,
    data
  );
}

/**
 * 公開セッション一覧を取得
 */
export async function getPublicSessions(
  projectId: string,
  limit = 50,
  offset = 0
): Promise<PublicSessionList> {
  return apiClient.get<PublicSessionList>(
    `/api/projects/${projectId}/public-access/sessions?limit=${limit}&offset=${offset}`
  );
}

/**
 * アクセス統計を取得
 */
export async function getPublicAccessStats(projectId: string): Promise<PublicAccessStats> {
  return apiClient.get<PublicAccessStats>(`/api/projects/${projectId}/public-access/stats`);
}

// ============================================
// Public API (認証不要)
// ============================================

export interface PublicProjectInfo {
  project_name: string;
  description: string | null;
  requires_password: boolean;
  is_accessible: boolean;
  error: string | null;
}

export interface VerifyPasswordResponse {
  verified: boolean;
  session_token: string | null;
  error: string | null;
}

export interface PublicCommand {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicCommandList {
  commands: PublicCommand[];
}

export interface CreatePublicSessionResponse {
  session_id: string;
  command: PublicCommand | null;
  limits: {
    max_messages: number | null;
    remaining_messages: number | null;
  };
  mode: 'command' | 'free_chat';
}

/**
 * 公開プロジェクト情報を取得（認証不要）
 */
export async function getPublicProjectInfo(token: string): Promise<PublicProjectInfo> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/public/${token}`);
  return response.json();
}

/**
 * パスワード認証（認証不要）
 */
export async function verifyPublicPassword(
  token: string,
  password: string
): Promise<VerifyPasswordResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/public/${token}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.json();
}

/**
 * 公開コマンド一覧を取得（認証不要、パスワード認証後はトークン必要）
 */
export async function getPublicCommands(
  token: string,
  sessionToken?: string
): Promise<PublicCommandList> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const headers: HeadersInit = {};
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  const response = await fetch(`${baseUrl}/api/public/${token}/commands`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch commands');
  }
  return response.json();
}

/**
 * 公開セッションを作成（認証不要、パスワード認証後はトークン必要）
 * @param token アクセストークン
 * @param commandId コマンドID（フリーチャット時はnull/undefined）
 * @param sessionToken セッショントークン（パスワード認証後）
 */
export async function createPublicSession(
  token: string,
  commandId?: string | null,
  sessionToken?: string
): Promise<CreatePublicSessionResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  const body: { command_id?: string } = {};
  if (commandId) {
    body.command_id = commandId;
  }
  const response = await fetch(`${baseUrl}/api/public/${token}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  return response.json();
}
