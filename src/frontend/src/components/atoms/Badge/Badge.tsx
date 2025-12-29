'use client';

import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium',
        {
          'bg-bg-tertiary text-text-tertiary': variant === 'default',
          'bg-accent-muted text-accent': variant === 'accent',
          'bg-green-500/15 text-green-400': variant === 'success',
          'bg-yellow-500/15 text-yellow-400': variant === 'warning',
          'bg-red-500/15 text-red-400': variant === 'error',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
