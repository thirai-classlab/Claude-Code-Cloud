/**
 * ProjectCard Component
 * Displays a project card with Linear Style (Pattern 09 v2 - No Icons) design
 * Uses dot indicators instead of folder icons
 */

import React from 'react';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';

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
  return (
    <div
      className={cn(
        'nav-item group',
        isSelected && 'active'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Expand/Collapse Indicator */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'w-4 h-4 flex items-center justify-center',
          'text-text-tertiary hover:text-text-secondary',
          'transition-transform duration-100',
          isExpanded && 'rotate-90'
        )}
        aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
        aria-expanded={isExpanded}
      >
        <span className="text-xs">{'>'}</span>
      </button>

      {/* Dot Indicator */}
      <Indicator active={isSelected} />

      {/* Project Info */}
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
        <span className="truncate text-base">
          {project.name}
        </span>
        <span className="text-xs text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded flex-shrink-0">
          {project.session_count}
        </span>
      </div>
    </div>
  );
};
