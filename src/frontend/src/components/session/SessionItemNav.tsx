/**
 * SessionItemNav Component
 * Session item with route-based navigation (uses Link instead of onClick)
 * Linear Style (Pattern 09 v2 - No Icons) design
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Session } from '@/types/session';
import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';

export interface SessionItemNavProps {
  session: Session;
  projectId: string;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const SessionItemNav: React.FC<SessionItemNavProps> = ({
  session,
  projectId,
  isSelected,
  onContextMenu,
}) => {
  const formattedTime = new Date(session.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/projects/${projectId}/sessions/${session.id}`}
      className={cn(
        'nav-item group',
        isSelected && 'active'
      )}
      onContextMenu={onContextMenu}
    >
      {/* Dot Indicator */}
      <Indicator
        active={isSelected}
        color={session.status === 'active' ? 'success' : 'default'}
      />

      {/* Session Info */}
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm">
          {session.name || 'Untitled Session'}
        </span>
        <span className="text-xs text-text-tertiary flex-shrink-0">
          {formattedTime}
        </span>
      </div>
    </Link>
  );
};
