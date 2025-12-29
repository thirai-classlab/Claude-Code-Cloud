/**
 * WelcomePanel Component
 * Displays project and session selection when no session is active
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { CreateSessionModal } from '@/components/session/CreateSessionModal';

export const WelcomePanel: React.FC = () => {
  const {
    projects,
    currentProjectId,
    isLoading: projectsLoading,
    loadProjects,
    createProject,
    selectProject,
  } = useProjects();

  const {
    sessions,
    isLoading: sessionsLoading,
    loadSessions,
    createSession,
    selectSession,
  } = useSessions(currentProjectId || undefined);

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load sessions when project is selected
  useEffect(() => {
    if (currentProjectId) {
      loadSessions(currentProjectId);
    }
  }, [currentProjectId, loadSessions]);

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    const project = await createProject(data);
    selectProject(project.id);
    setIsCreateProjectModalOpen(false);
  };

  const handleCreateSession = async (data: { title?: string }) => {
    if (!currentProjectId) return;
    const session = await createSession(currentProjectId, data);
    selectSession(session.id);
    setIsCreateSessionModalOpen(false);
  };

  const handleSessionClick = (sessionId: string) => {
    selectSession(sessionId);
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Welcome to Claude Code
        </h1>
        <p className="text-text-secondary">
          Select a project and session to start coding with AI assistance
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Project Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Projects</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateProjectModalOpen(true)}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
          </div>

          {projectsLoading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 bg-bg-secondary rounded-lg border border-border">
              <svg className="w-12 h-12 mx-auto mb-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-text-secondary mb-2">No projects yet</p>
              <p className="text-text-tertiary text-sm">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    currentProjectId === project.id
                      ? 'border-accent bg-accent-muted ring-2 ring-accent/30'
                      : 'border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      currentProjectId === project.id ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{project.name}</h3>
                      <p className="text-xs text-text-tertiary">
                        {project.session_count || 0} sessions
                      </p>
                    </div>
                    {currentProjectId === project.id && (
                      <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session Selection (only show when project is selected) */}
        {currentProjectId && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Sessions
                {currentProject && (
                  <span className="text-text-tertiary font-normal ml-2">
                    in {currentProject.name}
                  </span>
                )}
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateSessionModalOpen(true)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Session
              </Button>
            </div>

            {sessionsLoading && sessions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 bg-bg-secondary rounded-lg border border-border">
                <svg className="w-12 h-12 mx-auto mb-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-text-secondary mb-2">No sessions yet</p>
                <p className="text-text-tertiary text-sm">Create a session to start chatting with Claude</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session.id)}
                    className="w-full p-4 rounded-lg border border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                          {session.title || `Session ${session.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-xs text-text-tertiary">
                          Created {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />
      <CreateSessionModal
        isOpen={isCreateSessionModalOpen}
        onClose={() => setIsCreateSessionModalOpen(false)}
        onSubmit={handleCreateSession}
      />
    </div>
  );
};
