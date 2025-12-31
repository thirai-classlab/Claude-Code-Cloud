/**
 * Sidebar Component
 * Displays project and session hierarchy with Linear Style (Pattern 09 v2) design
 * Updated for route-based navigation
 */
'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectListNav } from '@/components/project/ProjectListNav';
import { SearchInput } from '@/components/molecules';
import { Button } from '@/components/atoms';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { useProjects } from '@/hooks/useProjects';
import { useNavigation } from '@/hooks/useRouteSync';

/**
 * NavDivider - Subtle horizontal divider for sidebar sections
 */
const NavDivider: React.FC = () => (
  <div className="h-px bg-border-subtle my-2" role="separator" />
);

/**
 * NavLabel - Section label for sidebar navigation groups
 */
interface NavLabelProps {
  children: React.ReactNode;
}

const NavLabel: React.FC<NavLabelProps> = ({ children }) => (
  <div className="text-xs font-medium text-text-tertiary px-2.5 py-2 pt-2 pb-1 uppercase tracking-wider">
    {children}
  </div>
);

export interface SidebarProps {
  /** Optional className for custom styling */
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createProject, loadProjects } = useProjects();
  const { navigateToProject } = useNavigation();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const executeSearch = useCallback(() => {
    const trimmed = searchInput.trim();
    setActiveSearch(trimmed);
    loadProjects(trimmed ? { search: trimmed } : undefined);
  }, [searchInput, loadProjects]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  }, [executeSearch]);

  const handleCreateProject = useCallback(async (data: { name: string; description?: string; api_key?: string }) => {
    const project = await createProject(data);
    // Navigate to the new project page
    navigateToProject(project.id);
    setIsCreateModalOpen(false);
  }, [createProject, navigateToProject]);

  return (
    <div
      className={`
        h-full flex flex-col overflow-hidden
        ${className || ''}
      `.trim()}
      role="navigation"
      aria-label="Projects and Sessions"
    >
      {/* Fixed header area - does not scroll */}
      <div className="flex-shrink-0 px-2 pt-2 pb-2 space-y-2">
        {/* Projects section label */}
        <NavLabel>{t('project.projects')}</NavLabel>

        {/* New project button */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full"
        >
          {t('project.newProject')}
        </Button>

        {/* Search input - Press Enter to search */}
        <SearchInput
          value={searchInput}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('project.search')}
          size="sm"
        />
      </div>

      {/* Project list with scroll - now uses route navigation */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ProjectListNav activeSearch={activeSearch} />
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// Export sub-components for external use
export { NavDivider, NavLabel };
