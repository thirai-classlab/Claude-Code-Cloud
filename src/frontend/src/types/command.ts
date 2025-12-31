/**
 * Command Types
 * Types for slash command configuration and management
 */

export type CommandCategory =
  | 'system'
  | 'core'
  | 'planning'
  | 'development'
  | 'analysis'
  | 'documentation'
  | 'git'
  | 'session'
  | 'specialized'
  | 'help'
  | 'custom';

export interface CommandConfig {
  enabled: boolean;
  description?: string;
  category: CommandCategory;
  settings: Record<string, unknown>;
}

export interface CommandsConfig {
  commands: Record<string, CommandConfig>;
  defaultEnabled: string[];
  version: string;
}

export interface CommandsConfigResponse {
  config: CommandsConfig;
  path: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  category: CommandCategory;
  defaultEnabled: boolean;
}

export interface ToggleCommandRequest {
  enabled: boolean;
}

export interface ToggleCommandResponse {
  message: string;
  command: string;
  enabled: boolean;
}

// Category display names for UI
export const COMMAND_CATEGORY_LABELS: Record<CommandCategory, string> = {
  system: 'System',
  core: 'Core',
  planning: 'Planning & Design',
  development: 'Development',
  analysis: 'Analysis & Research',
  documentation: 'Documentation',
  git: 'Git & Version Control',
  session: 'Session Management',
  specialized: 'Specialized',
  help: 'Help',
  custom: 'Custom',
};

// Create custom command request/response types
export interface CreateCustomCommandRequest {
  name: string;
  description: string;
  category: CommandCategory;
}

export interface CreateCustomCommandResponse {
  message: string;
  file_path: string;
  relative_path: string;
}
