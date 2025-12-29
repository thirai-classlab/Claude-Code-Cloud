/**
 * useRouteSync Hook
 * Synchronizes URL parameters with project/session stores
 */

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { useSessionStore } from '@/stores/sessionStore';

interface UseRouteSyncOptions {
  projectId?: string;
  sessionId?: string;
}

/**
 * Syncs URL parameters with store state
 * Call this hook in page components that need to sync route params with stores
 */
export const useRouteSync = (options?: UseRouteSyncOptions) => {
  const params = useParams();
  const { setCurrentProject, getCurrentProject } = useProjectStore();
  const { setCurrentSession, currentSessionId } = useSessionStore();

  // Extract IDs from options or params
  const projectId = options?.projectId ?? (params?.id as string | undefined);
  const sessionId = options?.sessionId ?? (params?.sessionId as string | undefined);

  // Sync project ID with store
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

  // Sync session ID with store
  useEffect(() => {
    if (sessionId) {
      setCurrentSession(sessionId);
    } else if (projectId && !sessionId) {
      // Clear session when on project page without session
      setCurrentSession(null);
    }
  }, [sessionId, projectId, setCurrentSession]);

  return {
    projectId,
    sessionId,
    currentProject: getCurrentProject(),
    currentSessionId,
  };
};

/**
 * Navigation helpers for route-based navigation
 */
export const useNavigation = () => {
  const router = useRouter();
  const { setCurrentProject } = useProjectStore();
  const { setCurrentSession } = useSessionStore();

  const navigateToHome = () => {
    setCurrentProject(null);
    setCurrentSession(null);
    router.push('/');
  };

  const navigateToProject = (projectId: string) => {
    setCurrentProject(projectId);
    setCurrentSession(null);
    router.push(`/projects/${projectId}`);
  };

  const navigateToSession = (projectId: string, sessionId: string) => {
    setCurrentProject(projectId);
    setCurrentSession(sessionId);
    router.push(`/projects/${projectId}/sessions/${sessionId}`);
  };

  return {
    navigateToHome,
    navigateToProject,
    navigateToSession,
  };
};
