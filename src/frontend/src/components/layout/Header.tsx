'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/atoms';
import { ThemeSelector } from '@/components/common/ThemeSelector';
import { LanguageSelector } from '@/components/common/LanguageSelector';
export const Header: React.FC = () => {
  const { t } = useTranslation();
  const params = useParams();
  const { toggleSidebar, isSidebarOpen } = useUIStore();
  const { getCurrentProject, projects } = useProjectStore();
  const { sessions } = useSessionStore();
  const { user, logout, isLoading: isAuthLoading } = useAuthStore();

  // Get IDs from URL params
  const projectIdFromUrl = params?.id as string | undefined;
  const sessionIdFromUrl = params?.sessionId as string | undefined;

  // Find current project and session from stores
  const currentProject = projectIdFromUrl
    ? projects.find(p => p.id === projectIdFromUrl) || getCurrentProject()
    : null;
  const currentSession = sessionIdFromUrl
    ? sessions.find(s => s.id === sessionIdFromUrl)
    : null;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="h-header flex items-center justify-between px-5 border-b border-border-subtle bg-bg-primary">
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <Button
          variant="default"
          size="sm"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? t('sidebar.closeSidebar') : t('sidebar.openSidebar')}
          aria-expanded={isSidebarOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>

        {/* Logo and title - links to home */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-accent to-purple-500" />
          <h1 className="text-base font-semibold text-text-primary">
            <span className="hidden sm:inline">Claude Code</span>
            <span className="sm:hidden">CC</span>
          </h1>
        </Link>

        {/* Breadcrumb navigation */}
        {currentProject && (
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span className="text-text-tertiary">/</span>
            <Link
              href={`/projects/${currentProject.id}`}
              className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
            >
              {currentProject.name}
            </Link>
            {currentSession && (
              <>
                <span className="text-text-tertiary">/</span>
                <span className="text-text-primary">
                  {currentSession.name || t('session.session')}
                </span>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Home button */}
        {(projectIdFromUrl || sessionIdFromUrl) && (
          <Link href="/">
            <Button
              variant="default"
              size="sm"
              title={t('nav.backToHome')}
            >
              {t('nav.home')}
            </Button>
          </Link>
        )}
        <LanguageSelector />
        <ThemeSelector />

        {/* User info and logout */}
        {user && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border-subtle">
            <span className="text-sm text-text-secondary hidden sm:inline">
              {user.display_name || user.email}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={handleLogout}
              disabled={isAuthLoading}
              title={t('auth.logout')}
            >
              {isAuthLoading ? t('auth.loggingOut') : t('auth.logout')}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
