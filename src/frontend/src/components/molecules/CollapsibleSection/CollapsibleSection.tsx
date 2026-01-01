'use client';

import { cn } from '@/lib/utils';
import { useState, type ReactNode } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultExpanded?: boolean;
  summary?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  description,
  defaultExpanded = false,
  summary,
  badge,
  children,
  className,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg-secondary overflow-hidden',
        className
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn(
              'w-4 h-4 text-text-tertiary transition-transform duration-200',
              expanded && 'rotate-90'
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">{title}</h3>
              {badge}
            </div>
            {description && !expanded && (
              <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {!expanded && summary && (
          <div className="text-sm text-text-tertiary">{summary}</div>
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-2 border-t border-border/50">
          {children}
        </div>
      </div>
    </div>
  );
}
