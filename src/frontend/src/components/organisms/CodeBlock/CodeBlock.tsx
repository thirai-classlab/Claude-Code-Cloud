'use client';

import { cn } from '@/lib/utils';
import { CodeHeader } from '@/components/molecules';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { useMemo, memo } from 'react';

export interface CodeBlockProps {
  language?: string;
  filename: string;
  code: string;
  onCopy?: () => void;
  className?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
}

/**
 * Language alias mapping for common variations
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  json: 'json',
  sql: 'sql',
  css: 'css',
  scss: 'scss',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  dockerfile: 'docker',
  makefile: 'makefile',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  java: 'java',
  kotlin: 'kotlin',
  swift: 'swift',
  php: 'php',
  graphql: 'graphql',
  gql: 'graphql',
};

/**
 * File extension to language mapping for auto-detection
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.go': 'go',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.json': 'json',
  '.sql': 'sql',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'css',
  '.html': 'markup',
  '.htm': 'markup',
  '.xml': 'xml',
  '.svg': 'markup',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
  '.php': 'php',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'docker',
  '.toml': 'toml',
  '.ini': 'ini',
  '.env': 'bash',
  '.gitignore': 'git',
  '.dockerignore': 'docker',
};

/**
 * Detect language from filename extension
 */
function detectLanguageFromFilename(filename: string): string | undefined {
  if (!filename) return undefined;

  // Handle special filenames
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename === 'dockerfile' || lowerFilename.endsWith('.dockerfile')) {
    return 'docker';
  }
  if (lowerFilename === 'makefile' || lowerFilename.endsWith('.mk')) {
    return 'makefile';
  }

  // Get extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return undefined;

  const extension = filename.slice(lastDotIndex).toLowerCase();
  return EXTENSION_TO_LANGUAGE[extension];
}

/**
 * Normalize language identifier to prism-react-renderer compatible format
 */
function normalizeLanguage(language?: string, filename?: string): Language {
  // Try explicit language first
  if (language) {
    const normalizedLang = language.toLowerCase().trim();
    const mapped = LANGUAGE_ALIASES[normalizedLang] || normalizedLang;
    return mapped as Language;
  }

  // Try to detect from filename
  if (filename) {
    const detected = detectLanguageFromFilename(filename);
    if (detected) return detected as Language;
  }

  // Default to plaintext
  return 'plaintext' as Language;
}

/**
 * Custom theme that uses CSS variables for Linear style compatibility
 */
const linearTheme = {
  ...themes.vsDark,
  plain: {
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: 'var(--syntax-comment)' },
    },
    {
      types: ['punctuation'],
      style: { color: 'var(--text-tertiary)' },
    },
    {
      types: ['namespace'],
      style: { opacity: 0.7 },
    },
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'],
      style: { color: 'var(--syntax-keyword)' },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: 'var(--syntax-string)' },
    },
    {
      types: ['operator', 'entity', 'url'],
      style: { color: 'var(--text-secondary)' },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: { color: 'var(--syntax-keyword)' },
    },
    {
      types: ['function', 'class-name'],
      style: { color: 'var(--syntax-function)' },
    },
    {
      types: ['regex', 'important', 'variable'],
      style: { color: 'var(--syntax-string)' },
    },
  ],
};

/**
 * CodeBlock component with syntax highlighting
 *
 * Features:
 * - Automatic language detection from filename
 * - Custom theme integrated with Linear design system
 * - Optional line numbers
 * - Performance optimized with memoization
 * - Accessible copy functionality
 */
export const CodeBlock = memo(function CodeBlock({
  language,
  filename,
  code,
  onCopy,
  className,
  showLineNumbers = false,
  maxHeight,
}: CodeBlockProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  };

  // Normalize and detect language
  const normalizedLanguage = useMemo(
    () => normalizeLanguage(language, filename),
    [language, filename]
  );

  // Trim trailing newline for cleaner display
  const trimmedCode = useMemo(() => code.replace(/\n$/, ''), [code]);

  // Calculate line number width based on total lines
  const lineCount = useMemo(() => trimmedCode.split('\n').length, [trimmedCode]);
  const lineNumberWidth = useMemo(() => {
    const digits = String(lineCount).length;
    return `${digits * 0.6 + 1}em`;
  }, [lineCount]);

  return (
    <div className={cn('code-block', className)}>
      <CodeHeader
        filename={filename}
        language={normalizedLanguage !== 'plaintext' ? normalizedLanguage : language}
        onCopy={handleCopy}
      />
      <Highlight
        theme={linearTheme}
        code={trimmedCode}
        language={normalizedLanguage}
      >
        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn('code-content', highlightClassName)}
            style={{
              ...style,
              maxHeight: maxHeight ? `${maxHeight}px` : undefined,
              backgroundColor: 'transparent',
            }}
          >
            <code className="block">
              {tokens.map((line, lineIndex) => {
                const lineProps = getLineProps({ line, key: lineIndex });
                return (
                  <div
                    key={lineIndex}
                    {...lineProps}
                    className={cn(lineProps.className, 'table-row')}
                  >
                    {showLineNumbers && (
                      <span
                        className="table-cell pr-4 text-right select-none text-text-tertiary"
                        style={{ width: lineNumberWidth }}
                        aria-hidden="true"
                      >
                        {lineIndex + 1}
                      </span>
                    )}
                    <span className="table-cell">
                      {line.map((token, tokenIndex) => (
                        <span key={tokenIndex} {...getTokenProps({ token, key: tokenIndex })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
});

export default CodeBlock;
