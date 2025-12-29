/**
 * ProjectCardNav Component
 * Project card with route-based navigation (uses Link instead of onClick)
 * Linear Style (Pattern 09 v2 - No Icons) design
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';

export interface ProjectCardNavProps {
  project: Project;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const ProjectCardNav: React.FC<ProjectCardNavProps> = ({
  project,
  isSelected,
  isExpanded,
  onToggle,
  onContextMenu,
}) => {
  return (
    <div
      className={cn(
        'nav-item group',
        isSelected && 'active'
      )}
      onContextMenu={onContextMenu}
    >
      {/* Expand/Collapse Indicator */}
      <button
        onClick={(e) => {
          e.preventDefault();
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

      {/* Project Link */}
      <Link
        href={`/projects/${project.id}`}
        className="flex-1 min-w-0 flex items-baseline justify-between gap-2"
      >
        <span className="truncate text-base">
          {project.name}
        </span>
        <span className="text-xs text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded flex-shrink-0">
          {project.session_count}
        </span>
      </Link>
    </div>
  );
};
