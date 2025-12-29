/**
 * ProjectPage Component
 * Displays project details and session list
 * Note: Right panel (VSCode) is handled by the parent layout
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { CreateSessionModal } from '@/components/session/CreateSessionModal';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { useNavigation } from '@/hooks/useRouteSync';
import { Session } from '@/types/session';

interface ProjectPageProps {
  projectId: string;
}

export const ProjectPage: React.FC<ProjectPageProps> = ({ projectId }) => {
  const { projects, loadProjects } = useProjects();
  const {
    sessions,
    isLoading: sessionsLoading,
    loadSessions,
    createSession,
  } = useSessions(projectId);

  const { navigateToSession } = useNavigation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Find current project
  const project = projects.find(p => p.id === projectId);

  // Load project and sessions on mount
  useEffect(() => {
    loadProjects();
    loadSessions(projectId);
  }, [projectId, loadProjects, loadSessions]);

  const handleCreateSession = async (data: { name?: string }) => {
    const session = await createSession(projectId, data);
    navigateToSession(projectId, session.id);
    setIsCreateModalOpen(false);
  };

  // Show loading while project is being fetched
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          <p className="text-text-secondary">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Project Header */}
        <div className="flex-shrink-0 px-6 py-6 border-b border-border-subtle">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-text-secondary max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + New Session
            </Button>
          </div>

          {/* Project Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-text-tertiary">
            <span>{project.session_count} sessions</span>
            <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Sessions</h2>

          {/* Loading State */}
          {sessionsLoading && sessions.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          )}

          {/* Empty State */}
          {!sessionsLoading && sessions.length === 0 && (
            <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-bg-tertiary flex items-center justify-center">
                <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-text-secondary mb-2">No sessions yet</p>
              <p className="text-sm text-text-tertiary mb-4">Create a session to start chatting with Claude</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Session
              </Button>
            </div>
          )}

          {/* Session Cards */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  projectId={projectId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSession}
      />
    </>
  );
};

/**
 * SessionCard - Individual session card
 */
interface SessionCardProps {
  session: Session;
  projectId: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, projectId }) => {
  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const statusColor = session.status === 'active'
    ? 'bg-emerald-500'
    : session.status === 'expired'
    ? 'bg-amber-500'
    : 'bg-red-500';

  return (
    <Link
      href={`/projects/${projectId}/sessions/${session.id}`}
      className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary transition-all duration-200"
    >
      {/* Session Icon */}
      <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors flex-shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>

      {/* Session Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-text-primary truncate">
            {session.name || `Session ${session.id.slice(0, 8)}`}
          </h3>
          <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
        </div>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>{session.message_count} messages</span>
          <span>{formattedDate}</span>
          {session.model && <span>{session.model}</span>}
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
};
