/**
 * SessionPage Component
 * Displays chat interface for a session
 * Note: Right panel (VSCode) is handled by the parent layout
 */
'use client';

import React, { useEffect } from 'react';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';

interface SessionPageProps {
  projectId: string;
  sessionId: string;
}

export const SessionPage: React.FC<SessionPageProps> = ({
  projectId,
  sessionId,
}) => {
  const { projects, loadProjects } = useProjects();
  const { loadSessions } = useSessions(projectId);

  // Find current project
  const project = projects.find(p => p.id === projectId);

  // Load project and sessions on mount
  useEffect(() => {
    loadProjects();
    loadSessions(projectId);
  }, [projectId, loadProjects, loadSessions]);

  // Show loading while project is being fetched
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          <p className="text-text-secondary">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatContainer
      sessionId={sessionId}
      projectId={projectId}
    />
  );
};
