'use client';

import React, { useState } from 'react';
import { FileNode } from '@/types/file';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  selectedPath?: string;
  onSelect: (path: string) => void;
  onToggle?: (path: string, expanded: boolean) => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  selectedPath,
  onSelect,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded || false);
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onToggle?.(node.path, newExpanded);
    }
  };

  const handleSelect = () => {
    if (!isDirectory) {
      onSelect(node.path);
    } else {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onToggle?.(node.path, newExpanded);
    }
  };

  const getFileIcon = () => {
    if (isDirectory) {
      return isExpanded ? '📂' : '📁';
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      ts: '📘',
      tsx: '⚛️',
      js: '📜',
      jsx: '⚛️',
      py: '🐍',
      json: '📋',
      md: '📝',
      css: '🎨',
      html: '🌐',
      yml: '⚙️',
      yaml: '⚙️',
      txt: '📄',
    };
    return iconMap[ext || ''] || '📄';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors ${
          isSelected ? 'bg-accent-muted text-accent' : 'text-text-primary'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {isDirectory && (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-4 h-4 hover:bg-bg-tertiary rounded text-text-secondary"
          >
            <ChevronIcon isExpanded={isExpanded} />
          </button>
        )}
        {!isDirectory && <div className="w-4" />}
        <span className="text-sm mr-1">{getFileIcon()}</span>
        <span className="text-sm flex-1 truncate">{node.name}</span>
        {!isDirectory && node.size !== undefined && (
          <span className="text-xs text-text-tertiary">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'directory' ? -1 : 1;
            })
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const ChevronIcon: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
  <svg
    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
);
