'use client';

import React, { useState, useCallback } from 'react';
import { Question } from '@/types/websocket';

interface QuestionCardProps {
  toolUseId: string;
  questions: Question[];
  onAnswer: (toolUseId: string, answers: Record<string, string>) => void;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  toolUseId,
  questions,
  onAnswer,
  disabled = false,
}) => {
  // 各質問ごとの選択状態を管理
  const [selections, setSelections] = useState<Record<number, Set<number>>>({});
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  const [showOther, setShowOther] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 選択肢をクリック
  const handleOptionClick = useCallback((questionIndex: number, optionIndex: number, multiSelect: boolean) => {
    if (disabled || isSubmitted) return;

    setSelections((prev) => {
      const current = prev[questionIndex] || new Set<number>();

      if (multiSelect) {
        // マルチセレクトの場合はトグル
        const newSet = new Set(current);
        if (newSet.has(optionIndex)) {
          newSet.delete(optionIndex);
        } else {
          newSet.add(optionIndex);
        }
        return { ...prev, [questionIndex]: newSet };
      } else {
        // シングルセレクトの場合は置き換え
        return { ...prev, [questionIndex]: new Set([optionIndex]) };
      }
    });

    // Other表示をリセット
    setShowOther((prev) => ({ ...prev, [questionIndex]: false }));
  }, [disabled, isSubmitted]);

  // Otherをクリック
  const handleOtherClick = useCallback((questionIndex: number) => {
    if (disabled || isSubmitted) return;

    setShowOther((prev) => ({ ...prev, [questionIndex]: true }));
    setSelections((prev) => ({ ...prev, [questionIndex]: new Set() }));
  }, [disabled, isSubmitted]);

  // Otherテキスト変更
  const handleOtherTextChange = useCallback((questionIndex: number, text: string) => {
    setOtherTexts((prev) => ({ ...prev, [questionIndex]: text }));
  }, []);

  // 送信
  const handleSubmit = useCallback(() => {
    console.log('[QuestionCard] handleSubmit called', {
      disabled,
      isSubmitted,
      toolUseId,
      selections: Object.fromEntries(
        Object.entries(selections).map(([k, v]) => [k, Array.from(v)])
      ),
    });

    if (disabled || isSubmitted) {
      console.log('[QuestionCard] Skipping submit - disabled or already submitted');
      return;
    }

    const answers: Record<string, string> = {};

    questions.forEach((question, qIndex) => {
      const selected = selections[qIndex];
      const otherText = otherTexts[qIndex];
      const isOtherSelected = showOther[qIndex] && otherText?.trim();

      if (isOtherSelected) {
        answers[String(qIndex)] = `other:${otherText}`;
      } else if (selected && selected.size > 0) {
        if (question.multiSelect) {
          // マルチセレクトはカンマ区切り
          answers[String(qIndex)] = Array.from(selected).sort().join(',');
        } else {
          // シングルセレクト
          answers[String(qIndex)] = String(Array.from(selected)[0]);
        }
      }
    });

    console.log('[QuestionCard] Submitting answers:', answers);
    setIsSubmitted(true);
    onAnswer(toolUseId, answers);
    console.log('[QuestionCard] onAnswer called');
  }, [disabled, isSubmitted, questions, selections, otherTexts, showOther, toolUseId, onAnswer]);

  // 全ての質問に回答しているかチェック
  const isAllAnswered = questions.every((_, qIndex) => {
    const selected = selections[qIndex];
    const otherText = otherTexts[qIndex];
    const isOtherSelected = showOther[qIndex] && otherText?.trim();
    return isOtherSelected || (selected && selected.size > 0);
  });

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-border bg-bg-tertiary/50 p-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>回答を送信しました</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-accent font-medium">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Claude has a question</span>
      </div>

      {/* Questions */}
      {questions.map((question, qIndex) => (
        <div key={qIndex} className="space-y-3">
          {/* Question Header */}
          {question.header && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-accent/20 text-accent">
              {question.header}
            </span>
          )}

          {/* Question Text */}
          <p className="text-text-primary font-medium">{question.question}</p>

          {/* Options */}
          <div className="space-y-2">
            {question.options.map((option, optIndex) => {
              const isSelected = selections[qIndex]?.has(optIndex);
              return (
                <button
                  key={optIndex}
                  onClick={() => handleOptionClick(qIndex, optIndex, question.multiSelect)}
                  disabled={disabled}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all duration-fast
                    ${isSelected
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border bg-bg-secondary hover:border-accent/50 text-text-secondary hover:text-text-primary'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Number Badge */}
                    <span className={`
                      flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm font-medium
                      ${isSelected ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary'}
                    `}>
                      {optIndex + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-text-tertiary mt-0.5">{option.description}</div>
                      )}
                    </div>

                    {/* Checkbox/Radio indicator */}
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded-${question.multiSelect ? 'sm' : 'full'} border-2
                      ${isSelected
                        ? 'border-accent bg-accent'
                        : 'border-border'
                      }
                      flex items-center justify-center
                    `}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Other Option */}
            <button
              onClick={() => handleOtherClick(qIndex)}
              disabled={disabled}
              className={`
                w-full text-left p-3 rounded-lg border transition-all duration-fast
                ${showOther[qIndex]
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border bg-bg-secondary hover:border-accent/50 text-text-secondary hover:text-text-primary'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <span className={`
                  flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm font-medium
                  ${showOther[qIndex] ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary'}
                `}>
                  {question.options.length + 1}
                </span>
                <span className="font-medium">Other...</span>
              </div>
            </button>

            {/* Other Text Input */}
            {showOther[qIndex] && (
              <div className="ml-9">
                <input
                  type="text"
                  value={otherTexts[qIndex] || ''}
                  onChange={(e) => handleOtherTextChange(qIndex, e.target.value)}
                  placeholder="Enter your response..."
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={disabled || !isAllAnswered}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-fast
            ${isAllAnswered && !disabled
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
            }
          `}
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
};
