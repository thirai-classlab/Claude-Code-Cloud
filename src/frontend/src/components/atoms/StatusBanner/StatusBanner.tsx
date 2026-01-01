'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type StatusBannerVariant = 'active' | 'inactive' | 'warning' | 'error';

export interface StatusBannerAction {
  label: string;
  onClick: () => void;
}

export interface StatusBannerProps {
  variant: StatusBannerVariant;
  title: string;
  message?: string;
  action?: StatusBannerAction;
  children?: ReactNode;
  className?: string;
}

const variantStyles: Record<StatusBannerVariant, { container: string; dot: string; title: string }> = {
  active: {
    container: 'bg-green-500/10 border-green-500/30',
    dot: 'bg-green-500',
    title: 'text-green-400',
  },
  inactive: {
    container: 'bg-zinc-500/10 border-zinc-500/30',
    dot: 'bg-zinc-500',
    title: 'text-zinc-400',
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/30',
    dot: 'bg-yellow-500',
    title: 'text-yellow-400',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/30',
    dot: 'bg-red-500',
    title: 'text-red-400',
  },
};

export function StatusBanner({
  variant,
  title,
  message,
  action,
  children,
  className,
}: StatusBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        styles.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0', styles.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h4 className={cn('font-medium', styles.title)}>{title}</h4>
            {action && (
              <button
                onClick={action.onClick}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              >
                {action.label}
              </button>
            )}
          </div>
          {message && (
            <p className="mt-1 text-sm text-text-tertiary">{message}</p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
