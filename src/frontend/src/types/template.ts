/**
 * Template Types
 * プロジェクトテンプレートの型定義
 */

// ============================================
// Template File
// ============================================

export interface TemplateFile {
  id: string;
  template_id: string;
  file_path: string;
  content: string | null;
  created_at: string;
}

export interface CreateTemplateFileRequest {
  file_path: string;
  content: string | null;
}

// ============================================
// Template
// ============================================

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  mcp_servers: Record<string, unknown>[];
  agents: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  commands: Record<string, unknown>[];
  files: TemplateFile[];
  created_at: string;
  updated_at: string;
}

export interface TemplateListItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  file_count: number;
  mcp_server_count: number;
  agent_count: number;
  skill_count: number;
  command_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  mcp_servers?: Record<string, unknown>[];
  agents?: Record<string, unknown>[];
  skills?: Record<string, unknown>[];
  commands?: Record<string, unknown>[];
  files?: CreateTemplateFileRequest[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
  mcp_servers?: Record<string, unknown>[];
  agents?: Record<string, unknown>[];
  skills?: Record<string, unknown>[];
  commands?: Record<string, unknown>[];
}

// ============================================
// Template Operations
// ============================================

export interface CreateProjectFromTemplateRequest {
  template_id: string;
  project_name: string;
  project_description?: string;
  api_key?: string;
}

export interface CreateTemplateFromProjectRequest {
  project_id: string;
  template_name: string;
  template_description?: string;
  is_public?: boolean;
  include_files?: boolean;
  file_patterns?: string[];
  exclude_patterns?: string[];
}
