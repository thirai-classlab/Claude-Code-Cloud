/**
 * ProjectList Component
 * Displays a list of projects with expand/collapse functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProjectCard } from './ProjectCard';
import { SessionList } from '../session/SessionList';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';

export interface ProjectListProps {
  /** Search query to filter projects by name */
  searchQuery?: string;
}

export const ProjectList: React.FC<ProjectListProps> = ({ searchQuery = '' }) => {
  const {
    projects,
    currentProjectId,
    isLoading,
    error,
    loadProjects,
    deleteProject,
    selectProject,
  } = useProjects();

  const { loadSessions, clearSessions } = useSessions();

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase().trim();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query) ||
      (project.description && project.description.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

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

  // Load sessions when a project is expanded
  useEffect(() => {
    if (currentProjectId && expandedProjects.has(currentProjectId)) {
      loadSessions(currentProjectId);
    }
  }, [currentProjectId, expandedProjects, loadSessions]);

  const handleProjectClick = (projectId: string) => {
    selectProject(projectId);
    // Expand the project when selected
    if (!expandedProjects.has(projectId)) {
      setExpandedProjects((prev) => new Set(prev).add(projectId));
    }
  };

  const handleToggleExpand = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
        // Clear sessions when collapsing
        if (currentProjectId === projectId) {
          clearSessions();
        }
      } else {
        next.add(projectId);
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
    if (confirm('このプロジェクトとすべてのセッションを削除しますか？')) {
      try {
        await deleteProject(projectId);
        setContextMenu(null);
      } catch (err) {
        console.error('プロジェクトの削除に失敗しました:', err);
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
        {projects.length === 0 && !isLoading && (
          <div className="text-center py-8 text-text-tertiary">
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        )}

        {/* No search results */}
        {projects.length > 0 && filteredProjects.length === 0 && searchQuery && (
          <div className="text-center py-4 text-text-tertiary">
            <p className="text-xs">該当するプロジェクトがありません</p>
          </div>
        )}

        {filteredProjects.map((project) => (
          <div key={project.id} className="mb-1">
            <ProjectCard
              project={project}
              isSelected={currentProjectId === project.id}
              isExpanded={expandedProjects.has(project.id)}
              onClick={() => handleProjectClick(project.id)}
              onToggle={() => handleToggleExpand(project.id)}
              onContextMenu={(e) => handleContextMenu(project.id, e)}
            />
            {/* Sessions under expanded project */}
            {expandedProjects.has(project.id) && (
              <div className="ml-6 mt-1">
                <SessionList projectId={project.id} />
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
