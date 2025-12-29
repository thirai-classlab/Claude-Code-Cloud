'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms';
import { useState } from 'react';

export interface CodeHeaderProps {
  filename: string;
  language?: string;
  onCopy?: () => void;
  className?: string;
}

export function CodeHeader({ filename, language, onCopy, className }: CodeHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('code-header', className)}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-accent" />
        <span className="text-sm text-text-tertiary font-mono">{filename}</span>
        {language && (
          <span className="text-xs text-text-tertiary">({language})</span>
        )}
      </div>
      <Button variant="default" size="sm" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}
