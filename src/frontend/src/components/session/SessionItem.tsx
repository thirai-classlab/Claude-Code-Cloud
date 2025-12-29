/**
 * SessionItem Component
 * Displays a single session item with Linear Style (Pattern 09 v2 - No Icons) design
 */

import React from 'react';
import { Session } from '@/types/session';
import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';

export interface SessionItemProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isSelected,
  onClick,
  onContextMenu,
}) => {
  const formattedTime = new Date(session.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

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
      {/* Dot Indicator */}
      <Indicator
        active={isSelected}
        color={session.status === 'active' ? 'success' : 'default'}
      />

      {/* Session Info */}
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm">
          {session.title || 'Untitled Session'}
        </span>
        <span className="text-xs text-text-tertiary flex-shrink-0">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
