'use client';

import React, { useState } from 'react';
import { FileTreeItem } from './FileTreeItem';
import { useFiles } from '@/hooks/useFiles';

interface FileTreeProps {
  projectId: string;
  onFileSelect: (path: string) => void;
  selectedPath?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({
  projectId,
  onFileSelect,
  selectedPath,
}) => {
  const { files, loading, error, refreshFiles } = useFiles({
    projectId,
    autoLoad: true,
  });

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['.']));

  const handleToggle = (path: string, expanded: boolean) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    await refreshFiles();
  };

  if (loading && !files) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
          <span className="text-xs text-text-secondary">Loading files...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-red-500 text-2xl">⚠️</div>
          <p className="text-xs text-text-secondary max-w-xs">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!files || !files.children || files.children.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">📁</div>
          <p className="text-xs text-text-secondary max-w-xs">
            No files found in this project
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-text-primary">Files</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary rounded disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.children.map((node) => (
          <FileTreeItem
            key={node.path}
            node={{
              ...node,
              isExpanded: expandedPaths.has(node.path),
            }}
            level={0}
            selectedPath={selectedPath}
            onSelect={onFileSelect}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`w-4 h-4 ${className || ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);
