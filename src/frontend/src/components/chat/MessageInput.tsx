'use client';

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { CommandSuggest, SuggestItem } from './CommandSuggest';
import { commandsApi, skillsApi, projectConfigApi } from '@/lib/api';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  projectId?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  projectId,
}) => {
  const [message, setMessage] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestItems, setSuggestItems] = useState<SuggestItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SuggestItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandQuery, setCommandQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load commands and skills (including project-specific custom items)
  useEffect(() => {
    const loadItems = async () => {
      try {
        // Load built-in commands and available skills
        const [commands, skills] = await Promise.all([
          commandsApi.getAvailableCommands(),
          skillsApi.getAvailable(),
        ]);

        const commandItems: SuggestItem[] = commands.map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          category: cmd.category,
          type: 'command' as const,
        }));

        const skillItems: SuggestItem[] = skills.map(skill => ({
          name: skill.name,
          description: skill.description,
          category: 'skill',
          type: 'skill' as const,
        }));

        let allItems = [...commandItems, ...skillItems];

        // Load project-specific custom commands and skills if projectId is provided
        if (projectId) {
          try {
            const [projectCommands, projectSkills] = await Promise.all([
              projectConfigApi.listCommands(projectId),
              projectConfigApi.listSkills(projectId),
            ]);

            // Add project-specific commands with 'custom' category
            const customCommandItems: SuggestItem[] = projectCommands
              .filter(cmd => cmd.enabled)
              .map(cmd => ({
                name: cmd.name,
                description: cmd.description || 'Custom command',
                category: 'custom',
                type: 'command' as const,
              }));

            // Add project-specific skills
            const customSkillItems: SuggestItem[] = projectSkills
              .filter(skill => skill.enabled)
              .map(skill => ({
                name: skill.name,
                description: skill.description || 'Custom skill',
                category: 'custom',
                type: 'skill' as const,
              }));

            allItems = [...allItems, ...customCommandItems, ...customSkillItems];
          } catch (projectError) {
            // Project-specific items may fail if not authenticated - ignore
            console.debug('プロジェクト固有の設定読み込みをスキップ:', projectError);
          }
        }

        setSuggestItems(allItems);
      } catch (error) {
        console.error('コマンド/スキルの読み込みに失敗:', error);
      }
    };

    loadItems();
  }, [projectId]);

  // Filter items based on query
  useEffect(() => {
    if (!commandQuery) {
      setFilteredItems(suggestItems.slice(0, 10));
    } else {
      const query = commandQuery.toLowerCase();
      const filtered = suggestItems
        .filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        )
        .slice(0, 10);
      setFilteredItems(filtered);
    }
    setSelectedIndex(0);
  }, [commandQuery, suggestItems]);

  // Check if we should show suggestions
  const checkForCommandTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const lastSpace = textBeforeCursor.lastIndexOf(' ');
    const wordStart = Math.max(lastNewline, lastSpace) + 1;
    const currentWord = textBeforeCursor.substring(wordStart);

    if (currentWord.startsWith('/')) {
      const query = currentWord.substring(1);
      setCommandQuery(query);
      setShowSuggest(true);
      return true;
    }

    setShowSuggest(false);
    setCommandQuery('');
    return false;
  }, []);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      setShowSuggest(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleSelectSuggestion = useCallback((item: SuggestItem) => {
    const cursorPos = textareaRef.current?.selectionStart ?? message.length;
    const textBeforeCursor = message.substring(0, cursorPos);
    const textAfterCursor = message.substring(cursorPos);

    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const lastSpace = textBeforeCursor.lastIndexOf(' ');
    const wordStart = Math.max(lastNewline, lastSpace) + 1;

    const newMessage =
      message.substring(0, wordStart) +
      '/' + item.name + ' ' +
      textAfterCursor;

    setMessage(newMessage);
    setShowSuggest(false);
    setCommandQuery('');

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = wordStart + item.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [message]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggest && filteredItems.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev <= 0 ? filteredItems.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev >= filteredItems.length - 1 ? 0 : prev + 1
        );
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSelectSuggestion(filteredItems[selectedIndex]);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(filteredItems[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggest(false);
        return;
      }
    }

    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(newValue);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;

    checkForCommandTrigger(newValue, cursorPos);
  };

  const handleClick = () => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      checkForCommandTrigger(message, cursorPos);
    }
  };

  return (
    <div className="p-4 bg-bg-primary" ref={containerRef}>
      <div className="input-wrapper relative">
        {showSuggest && (
          <CommandSuggest
            items={filteredItems}
            selectedIndex={selectedIndex}
            onSelect={handleSelectSuggestion}
            onClose={() => setShowSuggest(false)}
            position="top"
          />
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          disabled={disabled}
          placeholder="Type a message... (/ for commands, Shift+Enter to send)"
          className="flex-1 resize-none bg-transparent text-text-primary placeholder-text-tertiary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-md"
          aria-label="Message input"
          rows={1}
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="btn btn-primary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
