/**
 * BaseLayout Component
 * Basic layout with sidebar + main content area
 * Used as the foundation for all page layouts
 */
'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ShortcutsHelp } from '@/components/common/ShortcutsHelp';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export interface BaseLayoutProps {
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();

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

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <ShortcutsHelp isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)} />
    </div>
  );
};
