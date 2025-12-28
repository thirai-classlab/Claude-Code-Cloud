/**
 * ShortcutsHelp Component
 * Display keyboard shortcuts guide
 */
'use client';

import React from 'react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  {
    key: 'Ctrl/⌘ + K',
    description: 'Open command palette',
    category: 'General',
  },
  {
    key: 'Ctrl/⌘ + B',
    description: 'Toggle sidebar',
    category: 'General',
  },
  {
    key: 'Ctrl/⌘ + /',
    description: 'Show keyboard shortcuts',
    category: 'General',
  },
  {
    key: 'Escape',
    description: 'Close modal or panel',
    category: 'General',
  },
  {
    key: 'Ctrl/⌘ + Enter',
    description: 'Send message',
    category: 'Chat',
  },
  {
    key: 'Ctrl/⌘ + Shift + L',
    description: 'Clear chat history',
    category: 'Chat',
  },
  {
    key: 'Ctrl/⌘ + S',
    description: 'Save file',
    category: 'Editor',
  },
  {
    key: 'Ctrl/⌘ + F',
    description: 'Find in file',
    category: 'Editor',
  },
  {
    key: 'Ctrl/⌘ + Shift + F',
    description: 'Find in files',
    category: 'Editor',
  },
];

const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-bg-primary rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-xl font-bold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded hover:bg-bg-secondary transition-colors"
                    >
                      <span className="text-text-primary">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded border border-border font-mono text-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-3 bg-bg-secondary">
          <p className="text-xs text-text-tertiary text-center">
            Press <kbd className="px-2 py-1 bg-bg-tertiary rounded border border-border">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};
