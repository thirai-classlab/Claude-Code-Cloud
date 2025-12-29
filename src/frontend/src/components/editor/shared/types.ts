/**
 * Shared types for editor components
 */

import React from 'react';

/**
 * Category type for grouping items
 */
export type EditorCategory =
  | 'custom'
  | 'exploration'
  | 'development'
  | 'quality'
  | 'documentation'
  | 'devops'
  | 'data';

/**
 * Category configuration with label and icon
 */
export interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
}

/**
 * Parsed markdown result with frontmatter metadata
 */
export interface ParsedMarkdown {
  meta: Record<string, unknown>;
  content: string;
}

/**
 * Success message handler function type
 */
export type ShowSuccessFunction = (message: string) => void;
