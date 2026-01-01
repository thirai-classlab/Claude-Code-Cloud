/**
 * Shared utilities for editor components
 *
 * This module exports common utilities used across:
 * - MCPSettingsEditor
 * - AgentSettingsEditor
 * - SkillsSettingsEditor
 * - CommandSettingsEditor
 */

// Types
export type {
  EditorCategory,
  CategoryConfig,
  ParsedMarkdown,
} from './types';

// Category configuration
export {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  AGENT_CATEGORY_ORDER,
  normalizeCategory,
} from './categoryConfig';

// Markdown parsing
export { parseMarkdownWithFrontmatter } from './parseMarkdownFrontmatter';

// Components
export { ToggleSwitch } from './ToggleSwitch';
export type { ToggleSwitchProps } from './ToggleSwitch';
