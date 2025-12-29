'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms';

// ドラフト保存のデバウンス時間（ms）
const DRAFT_SAVE_DEBOUNCE = 500;

export interface ChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // ドラフト機能
  initialDraft?: string;
  onDraftChange?: (value: string) => void;
}

export function ChatInput({
  value: controlledValue,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type a message...',
  className,
  initialDraft = '',
  onDraftChange,
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState(initialDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // 初期ドラフトの復元
  useEffect(() => {
    if (!isInitializedRef.current && initialDraft && controlledValue === undefined) {
      setInternalValue(initialDraft);
      isInitializedRef.current = true;
    }
  }, [initialDraft, controlledValue]);

  // ドラフト保存（デバウンス付き）
  const saveDraft = useCallback(
    (newValue: string) => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      draftTimeoutRef.current = setTimeout(() => {
        onDraftChange?.(newValue);
      }, DRAFT_SAVE_DEBOUNCE);
    },
    [onDraftChange]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      // コンポーネントアンマウント時に即座にドラフトを保存
      if (value.trim()) {
        onDraftChange?.(value);
      }
    };
  }, [value, onDraftChange]);

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    // ドラフト保存
    saveDraft(newValue);
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit?.(value.trim());
      if (controlledValue === undefined) {
        setInternalValue('');
      }
      // ドラフトをクリア
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      onDraftChange?.('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  return (
    <div className={cn('py-4', className)}>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none text-text-primary text-md font-sans resize-none outline-none min-h-[20px] max-h-[200px] leading-relaxed placeholder:text-text-tertiary"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 p-0 flex items-center justify-center text-md"
        >
          {'\u2191'}
        </Button>
      </div>
    </div>
  );
}
