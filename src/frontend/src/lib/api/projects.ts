/**
 * Project API Client
 * Handles project CRUD operations
 */

import { apiClient } from './client';
import { Project } from '@/types/project';
import { Session } from '@/types/session';

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface CreateSessionRequest {
  name?: string;
  model?: string;
}

export const projectsApi = {
  /**
   * Get all projects
   */
  async list(): Promise<ProjectsResponse> {
    return apiClient.get<ProjectsResponse>('/api/projects');
  },

  /**
   * Get a single project by ID
   */
  async get(projectId: string): Promise<Project> {
    return apiClient.get<Project>(`/api/projects/${projectId}`);
  },

  /**
   * Create a new project
   */
  async create(data: CreateProjectRequest): Promise<Project> {
    return apiClient.post<Project>('/api/projects', data);
  },

  /**
   * Update a project
   */
  async update(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    return apiClient.put<Project>(`/api/projects/${projectId}`, data);
  },

  /**
   * Delete a project
   */
  async delete(projectId: string): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${projectId}`);
  },

  /**
   * Get all sessions in a project
   */
  async getSessions(projectId: string): Promise<SessionsResponse> {
    return apiClient.get<SessionsResponse>(`/api/projects/${projectId}/sessions`);
  },

  /**
   * Create a new session in a project
   */
  async createSession(projectId: string, data: CreateSessionRequest): Promise<Session> {
    return apiClient.post<Session>(`/api/projects/${projectId}/sessions`, data);
  },
};
