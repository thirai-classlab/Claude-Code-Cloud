/**
 * Agent Types
 * Types for sub-agent configuration and management
 */

export type AgentCategory =
  | 'exploration'
  | 'development'
  | 'quality'
  | 'documentation'
  | 'devops'
  | 'data';

export interface AgentConfig {
  enabled: boolean;
  description?: string;
  category: AgentCategory;
  settings: Record<string, unknown>;
}

export interface AgentsConfig {
  agents: Record<string, AgentConfig>;
  defaultEnabled: string[];
  version: string;
}

export interface AgentsConfigResponse {
  config: AgentsConfig;
  path: string;
}

export interface AgentDefinition {
  name: string;
  description: string;
  category: AgentCategory;
  defaultEnabled: boolean;
}

export interface ToggleAgentRequest {
  enabled: boolean;
}

export interface ToggleAgentResponse {
  message: string;
  agent: string;
  enabled: boolean;
}

// Category display names for UI
export const AGENT_CATEGORY_LABELS: Record<AgentCategory, string> = {
  exploration: 'Exploration & Planning',
  development: 'Development',
  quality: 'Quality & Testing',
  documentation: 'Documentation',
  devops: 'DevOps & Infrastructure',
  data: 'Data & AI',
};

// Category icons (Heroicons class names)
export const AGENT_CATEGORY_ICONS: Record<AgentCategory, string> = {
  exploration: 'MagnifyingGlassIcon',
  development: 'CodeBracketIcon',
  quality: 'CheckBadgeIcon',
  documentation: 'DocumentTextIcon',
  devops: 'ServerStackIcon',
  data: 'ChartBarIcon',
};

// Model options for agents
export type AgentModel = 'sonnet' | 'opus' | 'haiku';

export const AGENT_MODEL_OPTIONS: { value: AgentModel; label: string }[] = [
  { value: 'sonnet', label: 'Claude Sonnet (Balanced)' },
  { value: 'opus', label: 'Claude Opus (Most Capable)' },
  { value: 'haiku', label: 'Claude Haiku (Fastest)' },
];

// Tool options for agents
export const AGENT_TOOL_OPTIONS: string[] = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
];

// Create custom agent request/response types
export interface CreateCustomAgentRequest {
  name: string;
  description: string;
  category: AgentCategory;
  model: AgentModel;
  tools: string[];
}

export interface CreateCustomAgentResponse {
  message: string;
  file_path: string;
  relative_path: string;
}
