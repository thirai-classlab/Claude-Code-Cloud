/**
 * ProjectListNav Component
 * Displays a list of projects with expand/collapse functionality
 * Uses router.push for navigation instead of store-based selection
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectCardNav } from './ProjectCardNav';
import { SessionListNav } from '../session/SessionListNav';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';

export interface ProjectListNavProps {
  /** Active search query (applied via API) */
  activeSearch?: string;
}

export const ProjectListNav: React.FC<ProjectListNavProps> = ({ activeSearch = '' }) => {
  const params = useParams();
  const currentProjectId = params?.id as string | undefined;

  const {
    projects,
    isLoading,
    error,
    loadProjects,
    deleteProject,
  } = useProjects();

  const { loadSessions, clearSessions } = useSessions();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    projectId: string;
    x: number;
    y: number;
  } | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-expand current project from URL
  useEffect(() => {
    if (currentProjectId) {
      setExpandedProjects((prev) => {
        if (prev.has(currentProjectId)) {
          return prev; // Already expanded, no state change
        }
        return new Set(prev).add(currentProjectId);
      });
    }
  }, [currentProjectId]);

  // Load sessions when a project is expanded
  useEffect(() => {
    if (currentProjectId && expandedProjects.has(currentProjectId)) {
      loadSessions(currentProjectId);
    }
  }, [currentProjectId, expandedProjects, loadSessions]);

  const handleToggleExpand = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
        // Clear sessions when collapsing the current project
        if (currentProjectId === projectId) {
          clearSessions();
        }
      } else {
        next.add(projectId);
        // Load sessions when expanding
        loadSessions(projectId);
      }
      return next;
    });
  };

  const handleContextMenu = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      projectId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Delete this project and all its sessions?')) {
      try {
        await deleteProject(projectId);
        setContextMenu(null);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Loading State */}
      {isLoading && projects.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 m-2 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Project List */}
      <div className="px-2">
        {projects.length === 0 && !isLoading && !activeSearch && (
          <div className="text-center py-8 text-text-tertiary">
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        )}

        {/* No search results */}
        {projects.length === 0 && !isLoading && activeSearch && (
          <div className="text-center py-4 text-text-tertiary">
            <p className="text-xs">No projects match &ldquo;{activeSearch}&rdquo;</p>
          </div>
        )}

        {projects.map((project) => (
          <div key={project.id} className="mb-1">
            <ProjectCardNav
              project={project}
              isSelected={currentProjectId === project.id}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => handleToggleExpand(project.id)}
              onContextMenu={(e) => handleContextMenu(project.id, e)}
            />
            {/* Sessions under expanded project */}
            {expandedProjects.has(project.id) && (
              <div className="ml-6 mt-1">
                <SessionListNav projectId={project.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-bg-secondary border border-border-subtle rounded-md py-1 z-50 animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover transition-colors duration-100"
            onClick={() => handleDeleteProject(contextMenu.projectId)}
          >
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
};
