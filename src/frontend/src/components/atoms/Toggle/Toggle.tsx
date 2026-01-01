'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: ToggleSize;
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ checked, onChange, size = 'md', label, disabled, className, ...props }, ref) => {
    const sizeClasses = {
      sm: {
        track: 'w-8 h-4',
        thumb: 'h-3 w-3',
        thumbOn: 'translate-x-4',
      },
      md: {
        track: 'w-11 h-6',
        thumb: 'h-5 w-5',
        thumbOn: 'translate-x-5',
      },
      lg: {
        track: 'w-14 h-7',
        thumb: 'h-6 w-6',
        thumbOn: 'translate-x-7',
      },
    };

    const sizes = sizeClasses[size];

    return (
      <label className={cn('relative inline-flex items-center cursor-pointer', disabled && 'cursor-not-allowed opacity-50', className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            sizes.track,
            'relative rounded-full transition-colors duration-200',
            checked ? 'bg-accent' : 'bg-bg-tertiary'
          )}
        >
          <div
            className={cn(
              sizes.thumb,
              'absolute top-[2px] left-[2px]',
              'bg-white rounded-full shadow-sm',
              'transition-transform duration-200',
              checked && sizes.thumbOn
            )}
          />
        </div>
        {label && (
          <span className="ml-3 text-sm text-text-primary">{label}</span>
        )}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';
