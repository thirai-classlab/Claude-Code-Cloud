'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * SearchInput Component
 * A minimal search input with search icon
 * Following Linear Style (Pattern 09 v2) design
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ size = 'sm', className, placeholder = '検索...', ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        {/* Search Icon */}
        <svg
          className={cn(
            'absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none',
            {
              'w-3.5 h-3.5': size === 'sm',
              'w-4 h-4': size === 'md',
            }
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        {/* Input */}
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={cn(
            'w-full bg-bg-tertiary border border-border-subtle rounded-md',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
            'transition-colors duration-100',
            {
              'pl-8 pr-2.5 py-1.5 text-xs': size === 'sm',
              'pl-9 pr-3 py-2 text-sm': size === 'md',
            }
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
