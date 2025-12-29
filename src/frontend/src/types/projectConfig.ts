/**
 * Project Config Types
 * Types for project-level MCP Server, Agent, Skill, Command configuration
 */

// ============================================
// MCP Server Types
// ============================================

export interface ProjectMCPServer {
  id: string;
  project_id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  enabled_tools?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectMCPServerRequest {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
  enabled_tools?: string[] | null;
}

export interface UpdateProjectMCPServerRequest {
  name?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
  enabled_tools?: string[] | null;
}

// ============================================
// MCP Tool Types
// ============================================

export interface MCPTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

export interface MCPTestResponse {
  success: boolean;
  tools: MCPTool[];
  error?: string;
}

export interface MCPToolsResponse {
  tools: MCPTool[];
}

// ============================================
// Agent Types
// ============================================

export interface ProjectAgent {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  category: string;
  model: string;
  tools: string[];
  system_prompt?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectAgentRequest {
  name: string;
  description?: string;
  category?: string;
  model?: string;
  tools?: string[];
  system_prompt?: string;
  enabled?: boolean;
}

export interface UpdateProjectAgentRequest {
  name?: string;
  description?: string;
  category?: string;
  model?: string;
  tools?: string[];
  system_prompt?: string;
  enabled?: boolean;
}

// ============================================
// Skill Types
// ============================================

export interface ProjectSkill {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  category: string;
  content?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectSkillRequest {
  name: string;
  description?: string;
  category?: string;
  content?: string;
  enabled?: boolean;
}

export interface UpdateProjectSkillRequest {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  enabled?: boolean;
}

// ============================================
// Command Types
// ============================================

export interface ProjectCommand {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  category: string;
  content?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectCommandRequest {
  name: string;
  description?: string;
  category?: string;
  content?: string;
  enabled?: boolean;
}

export interface UpdateProjectCommandRequest {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  enabled?: boolean;
}

// ============================================
// Aggregate Types
// ============================================

export interface ProjectConfigResponse {
  project_id: string;
  mcp_servers: ProjectMCPServer[];
  agents: ProjectAgent[];
  skills: ProjectSkill[];
  commands: ProjectCommand[];
}
