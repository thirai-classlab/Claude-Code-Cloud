'use client';

import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';

export interface StatusBadgeProps {
  status: 'active' | 'idle' | 'error' | 'loading';
  label?: string;
  className?: string;
}

const statusConfig = {
  active: { color: 'accent' as const, defaultLabel: 'Active' },
  idle: { color: 'default' as const, defaultLabel: 'Idle' },
  error: { color: 'error' as const, defaultLabel: 'Error' },
  loading: { color: 'warning' as const, defaultLabel: 'Loading' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-sm',
        {
          'bg-accent-muted text-accent': status === 'active',
          'bg-bg-tertiary text-text-tertiary': status === 'idle',
          'bg-red-500/15 text-red-400': status === 'error',
          'bg-yellow-500/15 text-yellow-400': status === 'loading',
        },
        className
      )}
    >
      <Indicator active={status === 'active'} color={config.color} />
      <span>{label || config.defaultLabel}</span>
    </div>
  );
}
