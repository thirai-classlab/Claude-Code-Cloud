import { cn } from '@/lib/utils';

export interface IndicatorProps {
  active?: boolean;
  color?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

export function Indicator({ active = false, color = 'default', size = 'md', className }: IndicatorProps) {
  return (
    <span
      className={cn(
        'rounded-full',
        {
          'w-1 h-1': size === 'sm',
          'w-1.5 h-1.5': size === 'md',
        },
        {
          'bg-text-tertiary': !active && color === 'default',
          'bg-accent': active || color === 'accent',
          'bg-green-500': color === 'success',
          'bg-yellow-500': color === 'warning',
          'bg-red-500': color === 'error',
        },
        className
      )}
    />
  );
}
