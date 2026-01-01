/**
 * SessionList Component
 * Displays sessions within a project
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionItem } from './SessionItem';
import { CreateSessionModal } from './CreateSessionModal';
import { Button } from '@/components/atoms';
import { useSessions } from '@/hooks/useSessions';
import { confirm } from '@/stores/confirmStore';

export interface SessionListProps {
  projectId: string;
}

export const SessionList: React.FC<SessionListProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const {
    sessions,
    currentSessionId,
    loadSessions,
    createSession,
    deleteSession,
    selectSession,
  } = useSessions(projectId);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    sessionId: string;
    x: number;
    y: number;
  } | null>(null);

  // Load sessions when project changes
  useEffect(() => {
    loadSessions(projectId);
  }, [projectId, loadSessions]);

  const handleSessionClick = (sessionId: string) => {
    selectSession(sessionId);
  };

  const handleContextMenu = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      sessionId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = await confirm({
      title: t('session.deleteTitle'),
      message: t('session.confirmDelete'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteSession(sessionId);
        setContextMenu(null);
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  const handleCreateSession = async (data: { name?: string }) => {
    const session = await createSession(projectId, data);
    selectSession(session.id);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="space-y-1">
      {/* New Session Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full justify-start"
      >
        {t('session.newSession')}
      </Button>

      {/* Session Items */}
      {sessions.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-text-tertiary">
            {t('session.noSessions')}
          </p>
        </div>
      ) : (
        sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isSelected={currentSessionId === session.id}
            onClick={() => handleSessionClick(session.id)}
            onContextMenu={(e) => handleContextMenu(session.id, e)}
          />
        ))
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-bg-secondary border border-border-subtle rounded-md py-1 z-50 animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover transition-colors duration-100"
            onClick={() => handleDeleteSession(contextMenu.sessionId)}
          >
            Delete Session
          </button>
        </div>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSession}
      />
    </div>
  );
};
