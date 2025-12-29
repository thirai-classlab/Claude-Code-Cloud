'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ShortcutsHelp } from '@/components/common/ShortcutsHelp';
import { WelcomePanel } from '@/components/common/WelcomePanel';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useProjectStore } from '@/stores/projectStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const MainLayout: React.FC = () => {
  const { isSidebarOpen, chatWidth, toggleSidebar } = useUIStore();
  const isMdOrLarger = useMediaQuery('(min-width: 768px)');
  const { currentSessionId } = useSessionStore();
  const { getCurrentProject } = useProjectStore();

  const currentProject = getCurrentProject();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        metaKey: true,
        description: 'Open command palette',
        action: () => setIsCommandPaletteOpen(true),
      },
      {
        key: 'k',
        ctrlKey: true,
        description: 'Open command palette',
        action: () => setIsCommandPaletteOpen(true),
      },
      {
        key: 'b',
        metaKey: true,
        description: 'Toggle sidebar',
        action: toggleSidebar,
      },
      {
        key: 'b',
        ctrlKey: true,
        description: 'Toggle sidebar',
        action: toggleSidebar,
      },
      {
        key: '/',
        metaKey: true,
        description: 'Show keyboard shortcuts',
        action: () => setIsShortcutsHelpOpen(true),
      },
      {
        key: '/',
        ctrlKey: true,
        description: 'Show keyboard shortcuts',
        action: () => setIsShortcutsHelpOpen(true),
      },
      {
        key: 'Escape',
        description: 'Close modals',
        action: () => {
          setIsCommandPaletteOpen(false);
          setIsShortcutsHelpOpen(false);
        },
        preventDefault: false,
      },
    ],
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Hidden on mobile, toggleable on tablet+ */}
        {isSidebarOpen && (
          <aside className="w-sidebar border-r border-border-subtle bg-bg-secondary flex-shrink-0 hidden md:flex md:flex-col overflow-hidden">
            <Sidebar />
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-bg-primary/80 backdrop-blur-sm md:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          >
            <aside
              className="w-sidebar h-full border-r border-border-subtle bg-bg-secondary flex flex-col overflow-hidden animate-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar />
            </aside>
          </div>
        )}

        {/* Chat Panel - Responsive width */}
        <div
          className="border-r border-border-subtle bg-bg-primary flex-shrink-0 w-full md:w-auto flex flex-col overflow-hidden"
          style={{
            width: isMdOrLarger ? `${chatWidth}px` : '100%',
            minWidth: isMdOrLarger ? '320px' : '100%',
            maxWidth: isMdOrLarger ? 'var(--chat-max-width, 860px)' : '100%',
          }}
        >
          {/* プロジェクトとセッション両方が選択された場合のみチャット表示 */}
          {currentProject && currentSessionId ? (
            <ChatContainer sessionId={currentSessionId} projectId={currentProject.id} />
          ) : (
            <WelcomePanel />
          )}
        </div>

        {/* Editor Panel - Hidden on mobile by default */}
        <div className="flex-1 bg-bg-tertiary hidden lg:flex lg:flex-col overflow-hidden">
          {currentProject ? (
            <EditorContainer
              projectId={currentProject.id}
              workspacePath={currentProject.workspace_path}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-text-secondary px-4">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold mb-2">No Project Selected</h2>
                <p className="text-sm sm:text-base">Create or select a project to view files</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Modals */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <ShortcutsHelp isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)} />
    </div>
  );
};
