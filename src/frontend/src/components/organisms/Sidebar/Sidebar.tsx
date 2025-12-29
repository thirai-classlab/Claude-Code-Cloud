'use client';

import { cn } from '@/lib/utils';
import { NavItem } from '@/components/molecules';

export interface Project {
  id: string;
  name: string;
}

export interface SidebarProps {
  projects?: Project[];
  currentProjectId?: string;
  onProjectSelect?: (id: string) => void;
  onNewChat?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function Sidebar({
  projects = [],
  currentProjectId,
  onProjectSelect,
  onNewChat,
  onSettings,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-sidebar bg-bg-secondary border-r border-border-subtle flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-border-subtle">
        <div className="w-5 h-5 bg-gradient-to-br from-accent to-purple-500 rounded-[5px]" />
        <span className="font-semibold text-base text-text-primary">Claude Code</span>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {/* Main Navigation */}
        <NavItem
          label="New Chat"
          shortcut="N"
          onClick={onNewChat}
        />

        {/* Divider */}
        <div className="h-px bg-border-subtle my-2" />

        {/* Projects Label */}
        <div className="px-2.5 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Projects
        </div>

        {/* Project List */}
        {projects.map((project) => (
          <NavItem
            key={project.id}
            label={project.name}
            active={project.id === currentProjectId}
            onClick={() => onProjectSelect?.(project.id)}
          />
        ))}

        {projects.length === 0 && (
          <div className="px-2.5 py-2 text-sm text-text-tertiary">
            No projects yet
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border-subtle my-2" />

        {/* Settings */}
        <NavItem
          label="Settings"
          onClick={onSettings}
        />
      </div>
    </aside>
  );
}
