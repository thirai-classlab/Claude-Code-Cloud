'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Button } from '@/components/atoms';
import { ThemeSelector } from '@/components/common/ThemeSelector';

export const Header: React.FC = () => {
  const { toggleSidebar, isSidebarOpen } = useUIStore();
  const { getCurrentProject, setCurrentProject } = useProjectStore();
  const { currentSessionId, setCurrentSession, sessions } = useSessionStore();

  const currentProject = getCurrentProject();
  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleBackToProjects = () => {
    setCurrentSession(null);
    setCurrentProject(null);
  };

  const handleBackToSessions = () => {
    setCurrentSession(null);
  };

  return (
    <header className="h-header flex items-center justify-between px-5 border-b border-border-subtle bg-bg-primary">
      <div className="flex items-center gap-4">
        {/* Sidebar toggle - text-based, no icon per Pattern 09 v2 */}
        <Button
          variant="default"
          size="sm"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          aria-expanded={isSidebarOpen}
        >
          Menu
        </Button>

        {/* Logo and title */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-accent to-purple-500" />
          <h1 className="text-base font-semibold text-text-primary">
            <span className="hidden sm:inline">Claude Code</span>
            <span className="sm:hidden">CC</span>
          </h1>
        </div>

        {/* Breadcrumb navigation */}
        {currentProject && (
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span className="text-text-tertiary">/</span>
            <button
              onClick={handleBackToProjects}
              className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
            >
              {currentProject.name}
            </button>
            {currentSession && (
              <>
                <span className="text-text-tertiary">/</span>
                <button
                  onClick={handleBackToSessions}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
                >
                  {currentSession.title || 'Session'}
                </button>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Home button - text-based, no icon per Pattern 09 v2 */}
        {(currentProject || currentSessionId) && (
          <Button
            variant="default"
            size="sm"
            onClick={handleBackToProjects}
            title="プロジェクトに戻る"
          >
            Home
          </Button>
        )}
        <ThemeSelector />
      </div>
    </header>
  );
};
