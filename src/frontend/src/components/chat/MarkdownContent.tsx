'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../organisms/CodeBlock';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Custom components for ReactMarkdown
const markdownComponents = {
  // Code blocks with syntax highlighting
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const isInline = !className && !props.node?.properties?.className;

    if (isInline) {
      return (
        <code className="bg-bg-tertiary text-accent px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }

    // For code blocks, use our CodeBlock component
    const codeString = String(children).replace(/\n$/, '');
    return <CodeBlock code={codeString} language={language} filename="" />;
  },
  // Paragraphs
  p: ({ children }: any) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  // Headings
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-text-primary">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-text-primary">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-text-primary">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-sm font-semibold mb-2 mt-2 first:mt-0 text-text-primary">{children}</h4>
  ),
  // Lists
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-3 space-y-1 text-text-secondary">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-3 space-y-1 text-text-secondary">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed">{children}</li>
  ),
  // Links
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {children}
    </a>
  ),
  // Blockquotes
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-accent/50 pl-4 my-3 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  // Tables (GFM)
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-border text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-bg-tertiary">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="border-b border-border">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 text-left font-semibold text-text-primary border border-border">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-2 text-text-secondary border border-border">{children}</td>
  ),
  // Horizontal rule
  hr: () => (
    <hr className="my-4 border-border" />
  ),
  // Strong/Bold
  strong: ({ children }: any) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  // Emphasis/Italic
  em: ({ children }: any) => (
    <em className="italic">{children}</em>
  ),
  // Strikethrough (GFM)
  del: ({ children }: any) => (
    <del className="line-through text-text-tertiary">{children}</del>
  ),
};

const MarkdownContentComponent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content text-md text-text-primary ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const MarkdownContent = memo(MarkdownContentComponent, (prev, next) => {
  return prev.content === next.content && prev.className === next.className;
});
