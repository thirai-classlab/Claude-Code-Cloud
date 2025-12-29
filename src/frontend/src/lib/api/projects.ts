/**
 * Project API Client
 * Handles project CRUD operations
 */

import { apiClient } from './client';
import { Project, UsageStats, CostLimitCheck, CostLimitUpdateRequest } from '@/types/project';
import { Session } from '@/types/session';

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  api_key?: string;
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

export interface ListProjectsParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export const projectsApi = {
  /**
   * Get all projects
   */
  async list(params?: ListProjectsParams): Promise<ProjectsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      searchParams.set('offset', params.offset.toString());
    }
    const query = searchParams.toString();
    const url = query ? `/api/projects?${query}` : '/api/projects';
    return apiClient.get<ProjectsResponse>(url);
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

  // ============================================
  // 使用量・利用制限API
  // ============================================

  /**
   * Get project usage statistics
   */
  async getUsage(projectId: string): Promise<UsageStats> {
    return apiClient.get<UsageStats>(`/api/projects/${projectId}/usage`);
  },

  /**
   * Check if project can be used (cost limits)
   */
  async checkCostLimits(projectId: string): Promise<CostLimitCheck> {
    return apiClient.get<CostLimitCheck>(`/api/projects/${projectId}/cost-limit-check`);
  },

  /**
   * Update project cost limits
   */
  async updateCostLimits(projectId: string, data: CostLimitUpdateRequest): Promise<Project> {
    return apiClient.put<Project>(`/api/projects/${projectId}/cost-limits`, data);
  },

  /**
   * Clear all cost limits
   */
  async clearCostLimits(projectId: string): Promise<Project> {
    return apiClient.delete<Project>(`/api/projects/${projectId}/cost-limits`);
  },
};
