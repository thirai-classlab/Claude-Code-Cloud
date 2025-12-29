'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms';
import { StatusBadge } from '@/components/molecules';

export interface HeaderProps {
  title?: string;
  status?: 'active' | 'idle' | 'error' | 'loading';
  onSearch?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function Header({
  title = 'Claude Code',
  status,
  onSearch,
  onSettings,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'h-header flex items-center justify-between px-5 border-b border-border-subtle bg-bg-primary',
        className
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-medium text-text-primary">{title}</h1>
        {status && <StatusBadge status={status} />}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <Button variant="default" size="sm" onClick={onSearch}>
          Search
        </Button>
        <Button variant="default" size="sm" onClick={onSettings}>
          Settings
        </Button>
      </div>
    </header>
  );
}
