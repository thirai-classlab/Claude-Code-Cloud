'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/organisms';

/**
 * Project type for sidebar navigation
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
}

/**
 * MainLayout component props
 * Primary layout template for the application
 */
export interface MainLayoutProps {
  /** Child content to render in the main area */
  children: ReactNode;
  /** List of projects for sidebar navigation */
  projects?: Project[];
  /** Currently selected project ID */
  currentProjectId?: string;
  /** Title displayed in the header */
  headerTitle?: string;
  /** Connection/processing status indicator */
  headerStatus?: 'active' | 'idle' | 'error' | 'loading';
  /** Callback when a project is selected */
  onProjectSelect?: (id: string) => void;
  /** Callback for new chat action */
  onNewChat?: () => void;
  /** Callback for settings action */
  onSettings?: () => void;
  /** Callback for search action */
  onSearch?: () => void;
  /** Whether to show the sidebar */
  showSidebar?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MainLayout - Primary application layout template
 *
 * Provides the main structure with optional sidebar, header, and content area.
 * Follows Pattern 09 v2 (Linear Style) design specification.
 *
 * @example
 * ```tsx
 * <MainLayout
 *   projects={projects}
 *   currentProjectId="proj-1"
 *   headerTitle="Claude Code"
 *   headerStatus="active"
 *   onProjectSelect={handleProjectSelect}
 * >
 *   <ChatContainer />
 * </MainLayout>
 * ```
 */
export function MainLayout({
  children,
  projects = [],
  currentProjectId,
  headerTitle,
  headerStatus,
  onProjectSelect,
  onNewChat,
  onSettings,
  onSearch,
  showSidebar = true,
  className,
}: MainLayoutProps) {
  return (
    <div className={cn('flex h-screen bg-bg-primary', className)}>
      {/* Sidebar - Placeholder until Sidebar organism is implemented */}
      {showSidebar && (
        <aside className="w-sidebar flex flex-col bg-bg-secondary border-r border-border-subtle">
          {/* Sidebar Header */}
          <div className="h-header flex items-center gap-2 px-4 border-b border-border-subtle">
            <div className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-accent to-purple-500" />
            <span className="text-[13px] font-semibold text-text-primary">Claude Code</span>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Quick Actions */}
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              <span>New Chat</span>
            </button>

            {/* Projects Section */}
            {projects.length > 0 && (
              <>
                <div className="h-px bg-border-subtle my-2" />
                <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-2.5 py-1.5">
                  Projects
                </div>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onProjectSelect?.(project.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors',
                      project.id === currentProjectId
                        ? 'bg-bg-hover text-text-primary'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        project.id === currentProjectId ? 'bg-accent' : 'bg-text-tertiary'
                      )}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Settings */}
            <div className="h-px bg-border-subtle my-2" />
            <button
              onClick={onSettings}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              <span>Settings</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={headerTitle}
          status={headerStatus}
          onSearch={onSearch}
          onSettings={onSettings}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-chat mx-auto h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
