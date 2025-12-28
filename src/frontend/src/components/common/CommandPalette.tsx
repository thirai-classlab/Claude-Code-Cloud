/**
 * CommandPalette Component
 * Quick access to common actions via keyboard shortcuts
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: JSX.Element;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { toggleSidebar, toggleFileTree, setTheme } = useUIStore();
  const { clearMessages } = useChatStore();

  const commands: Command[] = [
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      action: () => {
        toggleSidebar();
        onClose();
      },
      keywords: ['sidebar', 'menu', 'navigation'],
    },
    {
      id: 'toggle-filetree',
      label: 'Toggle File Tree',
      description: 'Show or hide the file explorer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      action: () => {
        toggleFileTree();
        onClose();
      },
      keywords: ['files', 'explorer', 'tree'],
    },
    {
      id: 'theme-light',
      label: 'Set Light Theme',
      description: 'Switch to light theme',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      action: () => {
        setTheme('light');
        onClose();
      },
      keywords: ['theme', 'light', 'appearance'],
    },
    {
      id: 'theme-dark',
      label: 'Set Dark Theme',
      description: 'Switch to dark theme',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
      action: () => {
        setTheme('dark');
        onClose();
      },
      keywords: ['theme', 'dark', 'appearance'],
    },
    {
      id: 'theme-claude',
      label: 'Set Claude Theme',
      description: 'Switch to Claude theme',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      action: () => {
        setTheme('claude');
        onClose();
      },
      keywords: ['theme', 'claude', 'appearance'],
    },
    {
      id: 'clear-chat',
      label: 'Clear Chat History',
      description: 'Delete all messages in current session',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      action: () => {
        if (confirm('Are you sure you want to clear all messages?')) {
          clearMessages();
          onClose();
        }
      },
      keywords: ['clear', 'delete', 'messages', 'chat'],
    },
  ];

  const filteredCommands = commands.filter((command) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      command.label.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  useEffect(() => {
    if (listRef.current && filteredCommands[selectedIndex]) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-bg-primary rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="border-b border-border p-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-bg-secondary text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search commands"
              aria-autocomplete="list"
              aria-controls="command-list"
            />
          </div>
        </div>

        <div
          ref={listRef}
          id="command-list"
          className="max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Commands"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={command.action}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                  index === selectedIndex
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-bg-secondary border-l-4 border-transparent'
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="text-text-secondary">{command.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{command.label}</div>
                  <div className="text-xs text-text-tertiary truncate">{command.description}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-text-tertiary">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No commands found</p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 bg-bg-secondary text-xs text-text-tertiary flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-2 py-1 bg-bg-tertiary rounded border border-border">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-2 py-1 bg-bg-tertiary rounded border border-border">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-2 py-1 bg-bg-tertiary rounded border border-border">Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
