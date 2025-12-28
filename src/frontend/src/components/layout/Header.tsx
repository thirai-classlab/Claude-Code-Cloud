'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSessionStore } from '@/stores/sessionStore';
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
    <header className="h-12 sm:h-14 border-b border-border bg-primary flex items-center justify-between px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-primary-dark rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          aria-expanded={isSidebarOpen}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h1 className="text-base sm:text-lg font-bold text-white">
          <span className="hidden sm:inline">Claude Code</span>
          <span className="sm:hidden">CC</span>
        </h1>

        {/* Breadcrumb navigation */}
        {currentProject && (
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <span className="text-white/50">/</span>
            <button
              onClick={handleBackToProjects}
              className="hover:text-white hover:underline transition-colors"
            >
              {currentProject.name}
            </button>
            {currentSession && (
              <>
                <span className="text-white/50">/</span>
                <button
                  onClick={handleBackToSessions}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {currentSession.title || `セッション`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Home button */}
        {(currentProject || currentSessionId) && (
          <button
            onClick={handleBackToProjects}
            className="p-2 hover:bg-primary-dark rounded transition-colors text-white/80 hover:text-white"
            title="プロジェクトに戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        )}
        <ThemeSelector />
      </div>
    </header>
  );
};
