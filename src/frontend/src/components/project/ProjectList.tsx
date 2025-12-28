/**
 * ProjectList Component
 * Displays a list of projects with expand/collapse functionality
 */

import React, { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { SessionList } from '../session/SessionList';
import { CreateProjectModal } from './CreateProjectModal';
import { Button } from '@/components/common/Button';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';

export const ProjectList: React.FC = () => {
  const {
    projects,
    currentProjectId,
    isLoading,
    error,
    loadProjects,
    createProject,
    deleteProject,
    selectProject,
  } = useProjects();

  const { loadSessions, clearSessions } = useSessions();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    const project = await createProject(data);
    // Auto-expand and select the new project
    setExpandedProjects((prev) => new Set(prev).add(project.id));
    selectProject(project.id);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Project Button */}
      <div className="px-3 py-2 border-b border-border">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          新規プロジェクト
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && projects.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 m-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {projects.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">プロジェクトがありません</p>
            <p className="text-xs mt-1">作成して始めましょう</p>
          </div>
        )}

        {projects.map((project) => (
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
          className="fixed bg-bg-primary shadow-lg rounded-md py-1 z-50 border border-border"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleDeleteProject(contextMenu.projectId)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              プロジェクトを削除
            </span>
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};
