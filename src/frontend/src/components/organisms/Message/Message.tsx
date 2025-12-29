'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms';
import { MessageHeader } from '@/components/molecules';

export interface CodeBlockData {
  id: string;
  language: string;
  filename: string;
  code: string;
}

export interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  codeBlocks?: CodeBlockData[];
  onCopy?: () => void;
  className?: string;
}

export function Message({
  role,
  content,
  timestamp,
  codeBlocks,
  onCopy,
  className,
}: MessageProps) {
  const [showActions, setShowActions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    onCopy?.();
  };

  return (
    <div
      className={cn(
        'message group',
        'mb-5 p-4 rounded-lg transition-all duration-100',
        'hover:bg-bg-secondary',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <MessageHeader role={role} timestamp={timestamp} />
        <div
          className={cn(
            'transition-opacity duration-100',
            showActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Button variant="default" size="sm" onClick={handleCopy}>
            Copy
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="text-text-secondary text-md leading-relaxed pl-10">
        {content}
      </div>

      {/* Code Blocks - will be rendered by parent if needed */}
      {codeBlocks && codeBlocks.length > 0 && (
        <div className="pl-10 mt-3">
          {/* CodeBlocks would be rendered here by the parent component */}
        </div>
      )}
    </div>
  );
}
