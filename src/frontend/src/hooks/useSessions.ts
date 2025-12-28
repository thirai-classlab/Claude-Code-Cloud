/**
 * useSessions Hook
 * Manages session state and API interactions
 */

import { useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { projectsApi, sessionsApi, CreateSessionRequest, UpdateSessionRequest } from '@/lib/api';

export const useSessions = (projectId?: string) => {
  const {
    sessions,
    currentSessionId,
    isLoading,
    setSessions,
    addSession,
    removeSession,
    setCurrentSession,
    updateSessionTitle: updateSessionTitleInStore,
    clearSessions,
  } = useSessionStore();

  /**
   * Load sessions for a project
   */
  const loadSessions = useCallback(
    async (targetProjectId?: string) => {
      const pid = targetProjectId || projectId;
      if (!pid) {
        clearSessions();
        return;
      }

      try {
        const response = await projectsApi.getSessions(pid);
        setSessions(response.sessions);
      } catch (err: any) {
        console.error('Failed to load sessions:', err);
        throw err;
      }
    },
    [projectId, setSessions, clearSessions]
  );

  /**
   * Create a new session in a project
   */
  const createSession = useCallback(
    async (targetProjectId: string, data: CreateSessionRequest = {}) => {
      try {
        const session = await projectsApi.createSession(targetProjectId, data);
        addSession(session);
        return session;
      } catch (err: any) {
        console.error('Failed to create session:', err);
        throw err;
      }
    },
    [addSession]
  );

  /**
   * Update a session's title
   */
  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        const data: UpdateSessionRequest = { title };
        await sessionsApi.update(sessionId, data);
        updateSessionTitleInStore(sessionId, title);
      } catch (err: any) {
        console.error('Failed to update session:', err);
        throw err;
      }
    },
    [updateSessionTitleInStore]
  );

  /**
   * Delete a session
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await sessionsApi.delete(sessionId);
        removeSession(sessionId);
      } catch (err: any) {
        console.error('Failed to delete session:', err);
        throw err;
      }
    },
    [removeSession]
  );

  /**
   * Select a session
   */
  const selectSession = useCallback(
    (sessionId: string | null) => {
      setCurrentSession(sessionId);
    },
    [setCurrentSession]
  );

  /**
   * Load messages for the current session
   */
  const loadMessages = useCallback(
    async (sessionId: string) => {
      try {
        const response = await sessionsApi.getMessages(sessionId);
        return response.messages;
      } catch (err: any) {
        console.error('Failed to load messages:', err);
        throw err;
      }
    },
    []
  );

  return {
    sessions,
    currentSessionId,
    isLoading,
    loadSessions,
    createSession,
    updateSessionTitle,
    deleteSession,
    selectSession,
    loadMessages,
    clearSessions,
  };
};
