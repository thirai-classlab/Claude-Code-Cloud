/**
 * ProjectCard Component
 * Displays a project card with sessions count and metadata
 */

import React from 'react';
import { Project } from '@/types/project';
import { clsx } from 'clsx';

export interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  isExpanded,
  onClick,
  onToggle,
  onContextMenu,
}) => {
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={clsx(
        'group flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors',
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Expand/Collapse Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <svg
          className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-90')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Folder Icon */}
      <div className="mr-3 text-gray-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {project.name}
          </h3>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formattedDate}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {project.session_count} session{project.session_count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};
