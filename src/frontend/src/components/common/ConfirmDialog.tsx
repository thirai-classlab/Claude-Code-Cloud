/**
 * ConfirmDialog Component
 * Global confirmation dialog that replaces browser's native confirm()
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useConfirmStore } from '@/stores/confirmStore';
import { Button } from '@/components/atoms';
import { clsx } from 'clsx';

export const ConfirmDialog: React.FC = () => {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !options) return null;

  const { title, message, confirmLabel, cancelLabel, variant = 'danger' } = options;

  const variantConfig = {
    danger: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      buttonVariant: 'primary' as const,
    },
    info: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="relative bg-bg-primary rounded-lg shadow-2xl border border-border w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={clsx('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', config.iconBg)}>
              <span className={config.iconColor}>{config.icon}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 id="confirm-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h3>
              <p id="confirm-message" className="mt-2 text-sm text-text-secondary">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-bg-secondary/50 rounded-b-lg">
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            {cancelLabel || 'Cancel'}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={config.buttonVariant}
            size="sm"
            onClick={handleConfirm}
          >
            {confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};
