/**
 * ProjectPage Component
 * Displays project details and session list
 * Note: Right panel (VSCode) is handled by the parent layout
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { Modal } from '@/components/common/Modal';
import { CreateSessionModal } from '@/components/session/CreateSessionModal';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { useNavigation } from '@/hooks/useRouteSync';
import { templatesApi } from '@/lib/api/templates';
import { Session } from '@/types/session';

interface ProjectPageProps {
  projectId: string;
}

export const ProjectPage: React.FC<ProjectPageProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { projects, loadProjects } = useProjects();
  const {
    sessions,
    isLoading: sessionsLoading,
    loadSessions,
    createSession,
  } = useSessions(projectId);

  const { navigateToSession } = useNavigation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIsPublic, setTemplateIsPublic] = useState(false);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  // Find current project
  const project = projects.find(p => p.id === projectId);

  // Load project and sessions on mount
  useEffect(() => {
    loadProjects();
    loadSessions(projectId);
  }, [projectId, loadProjects, loadSessions]);

  const handleCreateSession = async (data: { name?: string; model?: string }) => {
    const session = await createSession(projectId, data);
    navigateToSession(projectId, session.id);
    setIsCreateModalOpen(false);
  };

  const openTemplateModal = () => {
    setTemplateName(project?.name ? `${project.name} Template` : '');
    setTemplateDescription('');
    setTemplateIsPublic(false);
    setIncludeFiles(true);
    setTemplateError(null);
    setTemplateSuccess(false);
    setIsTemplateModalOpen(true);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateError(null);

    if (!templateName.trim()) {
      setTemplateError('Template name is required');
      return;
    }

    setIsCreatingTemplate(true);
    try {
      await templatesApi.createFromProject({
        project_id: projectId,
        template_name: templateName.trim(),
        template_description: templateDescription.trim() || undefined,
        is_public: templateIsPublic,
        include_files: includeFiles,
      });
      setTemplateSuccess(true);
      setTimeout(() => {
        setIsTemplateModalOpen(false);
      }, 1500);
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  // Show loading while project is being fetched
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          <p className="text-text-secondary">{t('projectPage.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Project Header */}
        <div className="flex-shrink-0 px-6 py-6 border-b border-border-subtle">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-text-primary mb-1 truncate">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-text-secondary line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={openTemplateModal}
                className="whitespace-nowrap"
              >
                {t('projectPage.saveAsTemplate')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                className="whitespace-nowrap"
              >
                + {t('projectPage.newSession')}
              </Button>
            </div>
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
          <h2 className="text-lg font-semibold text-text-primary mb-4">{t('projectPage.sessions')}</h2>

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
              <p className="text-text-secondary mb-2">{t('projectPage.noSessions')}</p>
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

      {/* Create Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => !isCreatingTemplate && setIsTemplateModalOpen(false)}
        title="Save as Template"
        size="md"
      >
        {templateSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-success/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Template Created!</h3>
            <p className="text-text-secondary">Your template has been saved successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="My Template"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
                disabled={isCreatingTemplate}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={3}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                disabled={isCreatingTemplate}
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_files"
                  checked={includeFiles}
                  onChange={(e) => setIncludeFiles(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
                  disabled={isCreatingTemplate}
                />
                <label htmlFor="include_files" className="text-sm text-text-secondary">
                  Include workspace files
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={templateIsPublic}
                  onChange={(e) => setTemplateIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
                  disabled={isCreatingTemplate}
                />
                <label htmlFor="is_public" className="text-sm text-text-secondary">
                  Make this template public
                </label>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-bg-tertiary rounded-md text-xs text-text-secondary">
              <p className="mb-1">This template will include:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>MCP server configurations</li>
                <li>Agent definitions</li>
                <li>Skills and commands</li>
                {includeFiles && <li>Workspace files (text files only)</li>}
              </ul>
            </div>

            {/* Error */}
            {templateError && (
              <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-md">
                <p className="text-sm text-status-error">{templateError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsTemplateModalOpen(false)}
                disabled={isCreatingTemplate}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isCreatingTemplate}>
                Create Template
              </Button>
            </div>
          </form>
        )}
      </Modal>
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
