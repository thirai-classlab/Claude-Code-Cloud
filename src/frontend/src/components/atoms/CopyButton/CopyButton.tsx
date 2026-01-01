'use client';

import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';

export type CopyButtonVariant = 'default' | 'accent';
export type CopyButtonSize = 'sm' | 'md' | 'lg';

export interface CopyButtonProps {
  text: string;
  onCopy?: () => void;
  variant?: CopyButtonVariant;
  size?: CopyButtonSize;
  showLabel?: boolean;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({
  text,
  onCopy,
  variant = 'default',
  size = 'md',
  showLabel = true,
  label = 'Copy',
  copiedLabel = 'Copied!',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text, onCopy]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    default: 'bg-bg-tertiary text-text-primary border border-border hover:bg-bg-hover',
    accent: 'bg-accent text-white hover:bg-accent-hover',
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
        sizeClasses[size],
        variantClasses[variant],
        copied && variant === 'default' && 'border-green-500/50 text-green-400',
        copied && variant === 'accent' && 'bg-green-600',
        className
      )}
    >
      {copied ? (
        <svg className={iconSize} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className={iconSize} viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
      {showLabel && <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
