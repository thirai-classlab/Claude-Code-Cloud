'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', isLoading = false, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Variants
            'bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-primary':
              variant === 'default',
            'bg-accent text-white hover:bg-accent-hover': variant === 'primary',
            'bg-bg-tertiary text-text-primary border border-border hover:bg-bg-hover':
              variant === 'secondary',
            'border border-border bg-bg-tertiary text-text-primary hover:bg-bg-hover':
              variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500':
              variant === 'danger',
            // Sizes
            'px-2.5 py-1 text-xs': size === 'sm',
            'px-3 py-1.5 text-sm': size === 'md',
            'px-4 py-2 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
