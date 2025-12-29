/**
 * SplitLayout Component
 * Layout with main content + right panel (for VSCode/settings)
 * Used for project and session pages
 */
'use client';

import React from 'react';
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

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  children,
  projectId,
  workspacePath,
  leftPanelWidth,
}) => {
  const { chatWidth, isEditorPanelOpen } = useUIStore();
  const isMdOrLarger = useMediaQuery('(min-width: 768px)');

  const effectiveWidth = leftPanelWidth ?? chatWidth;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Main Content */}
      <div
        className={`border-r border-border-subtle bg-bg-primary w-full md:w-auto flex flex-col overflow-hidden ${
          isEditorPanelOpen ? 'flex-shrink-0' : 'flex-1'
        }`}
        style={isEditorPanelOpen ? {
          width: isMdOrLarger ? `${effectiveWidth}px` : '100%',
          minWidth: isMdOrLarger ? '320px' : '100%',
          maxWidth: isMdOrLarger ? 'var(--chat-max-width, 860px)' : '100%',
        } : {
          minWidth: isMdOrLarger ? '320px' : '100%',
        }}
      >
        {children}
      </div>

      {/* Right Panel - Editor/Settings */}
      <div
        className={`bg-bg-tertiary hidden lg:flex lg:flex-col overflow-hidden ${
          isEditorPanelOpen ? 'flex-1 animate-slide-in-right' : 'flex-shrink-0'
        }`}
      >
        <EditorContainer
          projectId={projectId}
          workspacePath={workspacePath}
        />
      </div>
    </div>
  );
};
