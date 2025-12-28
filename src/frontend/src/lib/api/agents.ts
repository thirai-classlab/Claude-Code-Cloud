/**
 * Agents Settings API
 * Handles agent configuration for projects
 */

import { apiClient } from './client';
import type {
  AgentDefinition,
  AgentsConfig,
  AgentsConfigResponse,
  ToggleAgentResponse,
  CreateCustomAgentRequest,
  CreateCustomAgentResponse,
} from '@/types/agent';

export const agentsApi = {
  /**
   * Get list of all available agents
   */
  getAvailableAgents: (): Promise<AgentDefinition[]> => {
    return apiClient.get<AgentDefinition[]>('/api/agents/available');
  },

  /**
   * Get agents configuration for a project
   */
  getConfig: (projectId: string): Promise<AgentsConfigResponse> => {
    return apiClient.get<AgentsConfigResponse>(`/api/agents/projects/${projectId}/config`);
  },

  /**
   * Update agents configuration for a project
   */
  updateConfig: (projectId: string, config: AgentsConfig): Promise<AgentsConfigResponse> => {
    return apiClient.put<AgentsConfigResponse>(`/api/agents/projects/${projectId}/config`, { config });
  },

  /**
   * Toggle a specific agent's enabled status
   */
  toggleAgent: (projectId: string, agentName: string, enabled: boolean): Promise<ToggleAgentResponse> => {
    return apiClient.patch<ToggleAgentResponse>(
      `/api/agents/projects/${projectId}/agents/${agentName}`,
      { enabled }
    );
  },

  /**
   * Reset agents configuration to defaults
   */
  resetConfig: (projectId: string): Promise<AgentsConfigResponse> => {
    return apiClient.post<AgentsConfigResponse>(`/api/agents/projects/${projectId}/reset`, {});
  },

  /**
   * Create a custom agent file
   */
  createCustomAgent: (projectId: string, request: CreateCustomAgentRequest): Promise<CreateCustomAgentResponse> => {
    return apiClient.post<CreateCustomAgentResponse>(`/api/agents/projects/${projectId}/custom`, request);
  },
};
