/**
 * Project Layout
 * Shared layout for project pages (project top + sessions)
 * The right panel (VSCode) is rendered here to prevent re-rendering on navigation
 */
'use client';

import React, { useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { useUIStore } from '@/stores/uiStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProjects } from '@/hooks/useProjects';
import { useRouteSync } from '@/hooks/useRouteSync';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { chatWidth, isEditorPanelOpen } = useUIStore();
  const isMdOrLarger = useMediaQuery('(min-width: 768px)');
  const { projects, loadProjects } = useProjects();

  // Sync project ID with stores
  useRouteSync({ projectId: params.id });

  // Load projects if not loaded
  useEffect(() => {
    if (projects.length === 0) {
      loadProjects();
    }
  }, [projects.length, loadProjects]);

  // Find current project
  const project = projects.find(p => p.id === params.id);

  return (
    <AuthGuard>
      <BaseLayout>
        <div className="flex h-full w-full overflow-hidden">
          {/* Left Panel - Main Content (children) */}
          <div
            className={`border-r border-border-subtle bg-bg-primary w-full md:w-auto flex flex-col overflow-hidden ${
              isEditorPanelOpen ? 'flex-shrink-0' : 'flex-1'
            }`}
            style={isEditorPanelOpen ? {
              width: isMdOrLarger ? `${chatWidth}px` : '100%',
              minWidth: isMdOrLarger ? '320px' : '100%',
              maxWidth: isMdOrLarger ? 'var(--chat-max-width, 860px)' : '100%',
            } : {
              minWidth: isMdOrLarger ? '320px' : '100%',
            }}
          >
            {children}
          </div>

          {/* Right Panel - Editor (shared, not re-rendered on navigation) */}
          <div
            className={`bg-bg-tertiary hidden lg:flex lg:flex-col overflow-hidden ${
              isEditorPanelOpen ? 'flex-1 animate-slide-in-right' : 'flex-shrink-0'
            }`}
          >
            {project ? (
              <EditorContainer
                projectId={params.id}
                workspacePath={project.workspace_path}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary px-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">Loading...</h2>
                  <p className="text-sm">Loading project workspace</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </BaseLayout>
    </AuthGuard>
  );
}
