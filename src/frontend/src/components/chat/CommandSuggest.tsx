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
      core: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      planning: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      development: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      analysis: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
      documentation: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
      git: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      session: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
      specialized: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
      help: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      skill: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const getTypeIcon = (type: 'command' | 'skill') => {
    if (type === 'skill') {
      return (
        <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div
      ref={listRef}
      className={`absolute left-0 right-0 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
      style={{ maxHeight: '300px' }}
    >
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          コマンド・スキル ({items.length})
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
                ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
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
                  {item.type === 'skill' ? 'スキル' : item.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
            移動
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Enter</kbd>
            選択
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd>
            閉じる
          </span>
        </div>
      </div>
    </div>
  );
};
