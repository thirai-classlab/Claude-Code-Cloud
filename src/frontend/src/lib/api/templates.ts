/**
 * Template API Client
 * Handles template CRUD and project operations
 */

import { apiClient } from './client';
import type { Project } from '@/types/project';
import type {
  Template,
  TemplateListItem,
  TemplateFile,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateTemplateFileRequest,
  CreateProjectFromTemplateRequest,
  CreateTemplateFromProjectRequest,
} from '@/types/template';

// ============================================
// Template CRUD
// ============================================

export const templatesApi = {
  /**
   * List all templates (user's own + public)
   */
  async list(params?: {
    include_public?: boolean;
    search?: string;
  }): Promise<TemplateListItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.include_public !== undefined) {
      queryParams.append('include_public', String(params.include_public));
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    const queryString = queryParams.toString();
    const url = `/api/templates${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<TemplateListItem[]>(url);
  },

  /**
   * Get a single template by ID
   */
  async get(templateId: string): Promise<Template> {
    return apiClient.get<Template>(`/api/templates/${templateId}`);
  },

  /**
   * Create a new template
   */
  async create(data: CreateTemplateRequest): Promise<Template> {
    return apiClient.post<Template>('/api/templates', data);
  },

  /**
   * Update a template
   */
  async update(templateId: string, data: UpdateTemplateRequest): Promise<Template> {
    return apiClient.patch<Template>(`/api/templates/${templateId}`, data);
  },

  /**
   * Delete a template
   */
  async delete(templateId: string): Promise<void> {
    return apiClient.delete<void>(`/api/templates/${templateId}`);
  },

  // ============================================
  // Template File Operations
  // ============================================

  /**
   * Add a file to a template
   */
  async addFile(
    templateId: string,
    data: CreateTemplateFileRequest
  ): Promise<TemplateFile> {
    return apiClient.post<TemplateFile>(
      `/api/templates/${templateId}/files`,
      data
    );
  },

  /**
   * Delete a file from a template
   */
  async deleteFile(templateId: string, fileId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/templates/${templateId}/files/${fileId}`
    );
  },

  // ============================================
  // Template <-> Project Operations
  // ============================================

  /**
   * Create a template from an existing project
   */
  async createFromProject(
    data: CreateTemplateFromProjectRequest
  ): Promise<Template> {
    return apiClient.post<Template>('/api/templates/from-project', data);
  },

  /**
   * Create a new project from a template
   */
  async createProject(
    data: CreateProjectFromTemplateRequest
  ): Promise<Project> {
    return apiClient.post<Project>('/api/templates/create-project', data);
  },
};
