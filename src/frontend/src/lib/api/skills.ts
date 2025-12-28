/**
 * Skills Settings API
 * Handles skills configuration for projects
 */

import { apiClient } from './client';
import type {
  SkillsConfig,
  SkillsConfigResponse,
  SkillDefinition,
  CreateCustomSkillRequest,
  CreateCustomSkillResponse,
} from '@/types/skill';

export const skillsApi = {
  /**
   * Get list of all available skills
   */
  getAvailable: (): Promise<SkillDefinition[]> => {
    return apiClient.get<SkillDefinition[]>('/api/skills/available');
  },

  /**
   * Get skills configuration for a project
   */
  getConfig: (projectId: string): Promise<SkillsConfigResponse> => {
    return apiClient.get<SkillsConfigResponse>(`/api/skills/projects/${projectId}/config`);
  },

  /**
   * Update skills configuration for a project
   */
  updateConfig: (projectId: string, config: SkillsConfig): Promise<SkillsConfigResponse> => {
    return apiClient.put<SkillsConfigResponse>(`/api/skills/projects/${projectId}/config`, { config });
  },

  /**
   * Toggle a specific skill's enabled status
   */
  toggleSkill: (projectId: string, skillName: string, enabled: boolean): Promise<{ message: string; skill: string; enabled: boolean }> => {
    return apiClient.patch<{ message: string; skill: string; enabled: boolean }>(
      `/api/skills/projects/${projectId}/skills/${skillName}`,
      { enabled }
    );
  },

  /**
   * Reset skills configuration to defaults
   */
  resetConfig: (projectId: string): Promise<SkillsConfigResponse> => {
    return apiClient.post<SkillsConfigResponse>(`/api/skills/projects/${projectId}/reset`);
  },

  /**
   * Create a custom skill file
   */
  createCustomSkill: (projectId: string, request: CreateCustomSkillRequest): Promise<CreateCustomSkillResponse> => {
    return apiClient.post<CreateCustomSkillResponse>(`/api/skills/projects/${projectId}/custom`, request);
  },
};
