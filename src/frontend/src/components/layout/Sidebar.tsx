/**
 * Sidebar Component
 * Displays project and session hierarchy with Linear Style (Pattern 09 v2) design
 */
'use client';

import React from 'react';
import { ProjectList } from '@/components/project/ProjectList';

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

/**
 * SidebarHeader - Logo and brand area
 */
const SidebarHeader: React.FC = () => (
  <div className="px-4 py-4 flex items-center gap-2 border-b border-border-subtle">
    <div
      className="w-5 h-5 rounded-[5px]"
      style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}
      aria-hidden="true"
    />
    <span className="font-semibold text-base text-text-primary">Claude Code</span>
  </div>
);

export interface SidebarProps {
  /** Optional className for custom styling */
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <div
      className={`
        h-full flex flex-col overflow-hidden
        ${className || ''}
      `.trim()}
      role="navigation"
      aria-label="Projects and Sessions"
    >
      {/* Header with logo */}
      <SidebarHeader />

      {/* Main navigation content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Projects section */}
        <NavLabel>Projects</NavLabel>
        <ProjectList />

        {/* Divider before settings (optional future section) */}
        <NavDivider />
      </div>
    </div>
  );
};

// Export sub-components for external use
export { NavDivider, NavLabel };
