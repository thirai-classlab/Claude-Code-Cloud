/**
 * Parse YAML frontmatter from markdown content
 *
 * Supports the following format:
 * ---
 * key: value
 * arrayKey:
 *   - item1
 *   - item2
 * ---
 *
 * Content after frontmatter
 */

import type { ParsedMarkdown } from './types';

/**
 * Parse markdown with YAML frontmatter
 * @param markdown - The markdown string with optional frontmatter
 * @returns Parsed result with meta object and content, or null if invalid format
 */
export const parseMarkdownWithFrontmatter = (markdown: string): ParsedMarkdown | null => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  if (!match) return null;

  const frontmatter = match[1];
  const content = match[2].trim();

  // Simple YAML parser
  const meta: Record<string, unknown> = {};
  const lines = frontmatter.split('\n');
  let currentKey = '';

  for (const line of lines) {
    // Array start (e.g., "tools:")
    if (line.match(/^(\w+):\s*$/)) {
      currentKey = line.match(/^(\w+):/)?.[1] || '';
      meta[currentKey] = [];
    }
    // Array item
    else if (line.match(/^\s+-\s+(.+)$/)) {
      const value = line.match(/^\s+-\s+(.+)$/)?.[1];
      if (currentKey && Array.isArray(meta[currentKey]) && value) {
        (meta[currentKey] as string[]).push(value);
      }
    }
    // Key: value
    else if (line.match(/^(\w+):\s*(.+)$/)) {
      const matches = line.match(/^(\w+):\s*(.+)$/);
      if (matches) {
        const [, key, value] = matches;
        meta[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
      currentKey = '';
    }
  }

  return { meta, content };
};
