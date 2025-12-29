'use client';

import { cn } from '@/lib/utils';
import { CodeHeader } from '@/components/molecules';

export interface CodeBlockProps {
  language?: string;
  filename: string;
  code: string;
  onCopy?: () => void;
  className?: string;
}

export function CodeBlock({
  language,
  filename,
  code,
  onCopy,
  className,
}: CodeBlockProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  };

  return (
    <div className={cn('code-block', className)}>
      <CodeHeader
        filename={filename}
        language={language}
        onCopy={handleCopy}
      />
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}
