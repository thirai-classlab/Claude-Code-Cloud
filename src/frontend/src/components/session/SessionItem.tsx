/**
 * SessionItem Component
 * Displays a single session item in the list
 */

import React from 'react';
import { Session } from '@/types/session';
import { clsx } from 'clsx';

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
      className={clsx(
        'flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors group',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/50'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Chat Icon */}
      <div className="mr-3 text-gray-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>

      {/* Session Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <h4 className="text-sm text-gray-900 dark:text-white truncate">
            {session.title || 'Untitled Session'}
          </h4>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formattedTime}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {session.message_count} message{session.message_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status Indicator */}
      {session.status === 'active' && (
        <div className="ml-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      )}
    </div>
  );
};
