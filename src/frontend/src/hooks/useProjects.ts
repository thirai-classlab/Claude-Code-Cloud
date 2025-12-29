/**
 * useProjects Hook
 * Manages project state and API interactions
 */

import { useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useSessionStore } from '@/stores/sessionStore';
import { projectsApi, CreateProjectRequest, UpdateProjectRequest, ListProjectsParams } from '@/lib/api';

export const useProjects = () => {
  const {
    projects,
    currentProjectId,
    isLoading,
    error,
    setProjects,
    addProject,
    updateProject: updateProjectInStore,
    removeProject,
    setCurrentProject,
    getCurrentProject,
    setLoading,
    setError,
  } = useProjectStore();

  /**
   * Load all projects from the API
   * @param params Optional search parameters
   */
  const loadProjects = useCallback(async (params?: ListProjectsParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await projectsApi.list(params);
      setProjects(response.projects);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [setProjects, setLoading, setError]);

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (data: CreateProjectRequest) => {
      setLoading(true);
      setError(null);
      try {
        const project = await projectsApi.create(data);
        addProject(project);
        return project;
      } catch (err: any) {
        setError(err.message || 'Failed to create project');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addProject, setLoading, setError]
  );

  /**
   * Update a project
   */
  const updateProject = useCallback(
    async (projectId: string, data: UpdateProjectRequest) => {
      setLoading(true);
      setError(null);
      try {
        const updatedProject = await projectsApi.update(projectId, data);
        updateProjectInStore(projectId, updatedProject);
        return updatedProject;
      } catch (err: any) {
        setError(err.message || 'Failed to update project');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateProjectInStore, setLoading, setError]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string) => {
      setLoading(true);
      setError(null);
      try {
        await projectsApi.delete(projectId);
        removeProject(projectId);
      } catch (err: any) {
        setError(err.message || 'Failed to delete project');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [removeProject, setLoading, setError]
  );

  /**
   * Select a project (also clears current session)
   */
  const selectProject = useCallback(
    (projectId: string | null) => {
      // プロジェクトが変わる場合はセッションをクリア
      if (projectId !== currentProjectId) {
        useSessionStore.getState().setCurrentSession(null);
      }
      setCurrentProject(projectId);
    },
    [currentProjectId, setCurrentProject]
  );

  return {
    projects,
    currentProject: getCurrentProject(),
    currentProjectId,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  };
};
