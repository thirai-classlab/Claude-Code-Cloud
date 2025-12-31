/**
 * HomePage Component
 * Displays project list as card grid on the home page
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { SearchInput } from '@/components/molecules';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { TemplateSection } from '@/components/template/TemplateSection';
import { useProjects } from '@/hooks/useProjects';
import { useNavigation } from '@/hooks/useRouteSync';
import { Project } from '@/types/project';
import type { TemplateListItem } from '@/types/template';

export const HomePage: React.FC = () => {
  const {
    projects,
    isLoading,
    loadProjects,
    createProject,
  } = useProjects();

  const { navigateToProject } = useNavigation();

  const [searchInput, setSearchInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    loadProjects(trimmed ? { search: trimmed } : undefined);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCreateProject = async (data: { name: string; description?: string; api_key?: string }) => {
    const project = await createProject(data);
    navigateToProject(project.id);
    setIsCreateModalOpen(false);
  };

  const handleProjectCreated = (project: Project) => {
    navigateToProject(project.id);
    setIsCreateModalOpen(false);
  };

  const handleSelectTemplate = (template: TemplateListItem) => {
    setSelectedTemplateId(template.id);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-6 border-b border-border-subtle">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Projects
          </h1>
          <p className="text-text-secondary mb-6">
            Select a project to start coding with AI assistance
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search projects..."
                size="md"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Template Section */}
          <TemplateSection onSelectTemplate={handleSelectTemplate} />

          {/* Projects Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Projects</h2>
          </div>

          {/* Loading State */}
          {isLoading && projects.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && projects.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bg-secondary flex items-center justify-center">
                <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">No projects yet</h2>
              <p className="text-text-secondary mb-6">Create your first project to get started</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Project
              </Button>
            </div>
          )}

          {/* Project Cards */}
          {projects.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTemplateId(undefined);
        }}
        onSubmit={handleCreateProject}
        onProjectCreated={handleProjectCreated}
        selectedTemplateId={selectedTemplateId}
      />
    </div>
  );
};

/**
 * ProjectCard - Individual project card for grid display
 */
interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const formattedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block p-5 rounded-lg border border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Project Icon */}
        <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate mb-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-text-secondary line-clamp-2 mb-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span>{project.session_count} sessions</span>
            <span>Updated {formattedDate}</span>
          </div>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};
