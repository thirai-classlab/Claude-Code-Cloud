/**
 * Command Suggest Component
 * Shows autocomplete suggestions for / commands
 */
'use client';

import React, { useEffect, useRef } from 'react';

export interface SuggestItem {
  name: string;
  description: string;
  category: string;
  type: 'command' | 'skill';
}

interface CommandSuggestProps {
  items: SuggestItem[];
  selectedIndex: number;
  onSelect: (item: SuggestItem) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export const CommandSuggest: React.FC<CommandSuggestProps> = ({
  items,
  selectedIndex,
  onSelect,
  onClose,
  position = 'top',
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (items.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      system: 'bg-blue-500/15 text-blue-400',
      core: 'bg-accent-muted text-accent',
      planning: 'bg-purple-500/15 text-purple-400',
      development: 'bg-emerald-500/15 text-emerald-400',
      analysis: 'bg-amber-500/15 text-amber-400',
      documentation: 'bg-orange-500/15 text-orange-400',
      git: 'bg-red-500/15 text-red-400',
      session: 'bg-cyan-500/15 text-cyan-400',
      specialized: 'bg-pink-500/15 text-pink-400',
      help: 'bg-bg-tertiary text-text-secondary',
      skill: 'bg-indigo-500/15 text-indigo-400',
      custom: 'bg-teal-500/15 text-teal-400',
    };
    return colors[category] || 'bg-bg-tertiary text-text-secondary';
  };

  const getTypeIcon = (type: 'command' | 'skill') => {
    if (type === 'skill') {
      return (
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div
      ref={listRef}
      className={`absolute left-0 right-0 z-50 bg-bg-secondary border border-border rounded-lg overflow-hidden ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
      style={{ maxHeight: '300px' }}
    >
      <div className="px-3 py-2 border-b border-border bg-bg-tertiary">
        <span className="text-xs text-text-tertiary">
          Commands & Skills ({items.length})
        </span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
        {items.map((item, index) => (
          <button
            key={`${item.type}-${item.name}`}
            ref={index === selectedIndex ? selectedRef : null}
            onClick={() => onSelect(item)}
            className={`w-full px-3 py-2 flex items-start gap-3 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-accent-muted text-text-primary'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getTypeIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  /{item.name}
                </span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${getCategoryColor(item.type === 'skill' ? 'skill' : item.category)}`}>
                  {item.type === 'skill' ? 'Skill' : item.category}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5 truncate">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border bg-bg-tertiary">
        <div className="flex items-center gap-4 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-hover rounded text-[10px]">Up/Down</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-hover rounded text-[10px]">Enter</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-hover rounded text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};
