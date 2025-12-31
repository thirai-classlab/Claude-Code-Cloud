/**
 * SessionListNav Component
 * Displays sessions within a project with route-based navigation
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SessionItemNav } from './SessionItemNav';
import { CreateSessionModal } from './CreateSessionModal';
import { Button } from '@/components/atoms';
import { useSessions } from '@/hooks/useSessions';
import { useNavigation } from '@/hooks/useRouteSync';

export interface SessionListNavProps {
  projectId: string;
}

export const SessionListNav: React.FC<SessionListNavProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const params = useParams();
  const currentSessionId = params?.sessionId as string | undefined;
  const { navigateToSession } = useNavigation();

  const {
    sessions,
    loadSessions,
    createSession,
    deleteSession,
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

  const handleContextMenu = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      sessionId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm(t('session.confirmDelete'))) {
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
    // Navigate to the new session
    navigateToSession(projectId, session.id);
    setIsCreateModalOpen(false);
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
          <SessionItemNav
            key={session.id}
            session={session}
            projectId={projectId}
            isSelected={currentSessionId === session.id}
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
