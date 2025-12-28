/**
 * Skill Types
 * Types for skill/command configuration and management
 */

export type SkillCategory =
  | 'core'
  | 'planning'
  | 'development'
  | 'analysis'
  | 'documentation'
  | 'git'
  | 'session'
  | 'specialized'
  | 'help';

export interface SkillConfig {
  enabled: boolean;
  description?: string;
  category: SkillCategory;
  settings: Record<string, unknown>;
}

export interface SkillsConfig {
  skills: Record<string, SkillConfig>;
  defaultEnabled: string[];
  version: string;
}

export interface SkillsConfigResponse {
  config: SkillsConfig;
  path: string;
}

export interface SkillDefinition {
  name: string;
  description: string;
  category: SkillCategory;
  defaultEnabled: boolean;
}

export interface ToggleSkillRequest {
  enabled: boolean;
}

export interface ToggleSkillResponse {
  message: string;
  skill: string;
  enabled: boolean;
}

// Category display names for UI
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  core: 'Core',
  planning: 'Planning & Design',
  development: 'Development',
  analysis: 'Analysis & Research',
  documentation: 'Documentation',
  git: 'Git & Version Control',
  session: 'Session Management',
  specialized: 'Specialized',
  help: 'Help',
};

// Category icons (Heroicons class names)
export const SKILL_CATEGORY_ICONS: Record<SkillCategory, string> = {
  core: 'CpuChipIcon',
  planning: 'LightBulbIcon',
  development: 'CodeBracketIcon',
  analysis: 'MagnifyingGlassIcon',
  documentation: 'DocumentTextIcon',
  git: 'ArrowsRightLeftIcon',
  session: 'ClockIcon',
  specialized: 'WrenchScrewdriverIcon',
  help: 'QuestionMarkCircleIcon',
};

// Create custom skill request/response types
export interface CreateCustomSkillRequest {
  name: string;
  description: string;
  category: SkillCategory;
}

export interface CreateCustomSkillResponse {
  message: string;
  file_path: string;
  relative_path: string;
}
