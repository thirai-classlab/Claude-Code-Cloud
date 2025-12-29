'use client';

import { cn } from '@/lib/utils';

export interface AvatarProps {
  name: string;
  variant: 'user' | 'assistant';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export function Avatar({ name, variant, size = 'md', className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md font-semibold',
        sizeClasses[size],
        {
          'bg-bg-tertiary text-text-secondary': variant === 'user',
          'bg-accent text-white': variant === 'assistant',
        },
        className
      )}
      role="img"
      aria-label={`${name} avatar`}
    >
      {initial}
    </div>
  );
}
