/**
 * SplitLayout Component
 * Layout with main content + right panel (for VSCode/settings)
 * Used for project and session pages
 */
'use client';

import React, { useEffect, useState } from 'react';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { useUIStore } from '@/stores/uiStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface SplitLayoutProps {
  children: React.ReactNode;
  projectId: string;
  workspacePath: string;
  /** Width of the left panel in pixels (default: from uiStore.chatWidth) */
  leftPanelWidth?: number;
}

// Collapsed panel width (icon bar)
const COLLAPSED_WIDTH = 48; // w-12

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  children,
  projectId,
  workspacePath,
  leftPanelWidth,
}) => {
  const { chatWidth, isEditorPanelOpen } = useUIStore();
  const isLgOrLarger = useMediaQuery('(min-width: 1024px)');
  const [mounted, setMounted] = useState(false);

  const effectiveWidth = leftPanelWidth ?? chatWidth;

  // Ensure transitions only happen after mount to prevent initial animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate right panel width
  const getRightPanelStyle = () => {
    if (!isLgOrLarger) {
      return { width: 0, minWidth: 0 };
    }

    if (isEditorPanelOpen) {
      // Expanded: fill remaining space with min-width
      return {
        flex: 1,
        minWidth: '400px',
      };
    }

    // Collapsed: icon bar width
    return {
      width: `${COLLAPSED_WIDTH}px`,
      minWidth: `${COLLAPSED_WIDTH}px`,
      flex: 'none',
    };
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Main Content */}
      <div
        className={`border-r border-border-subtle bg-bg-primary flex flex-col overflow-hidden ${
          mounted ? 'transition-all duration-300 ease-out' : ''
        }`}
        style={{
          width: isLgOrLarger && isEditorPanelOpen ? `${effectiveWidth}px` : '100%',
          minWidth: isLgOrLarger ? '320px' : '100%',
          maxWidth: isLgOrLarger && isEditorPanelOpen ? 'var(--chat-max-width, 860px)' : '100%',
          flex: isLgOrLarger && isEditorPanelOpen ? 'none' : 1,
        }}
      >
        {children}
      </div>

      {/* Right Panel - Editor/Settings */}
      <div
        className={`bg-bg-tertiary hidden lg:flex lg:flex-col overflow-hidden ${
          mounted ? 'transition-all duration-300 ease-out' : ''
        }`}
        style={getRightPanelStyle()}
      >
        {/* Inner content with opacity transition */}
        <div
          className={`h-full w-full ${
            mounted ? 'transition-opacity duration-300 ease-out' : ''
          } ${isEditorPanelOpen ? 'opacity-100' : 'opacity-100'}`}
        >
          <EditorContainer
            projectId={projectId}
            workspacePath={workspacePath}
          />
        </div>
      </div>
    </div>
  );
};
