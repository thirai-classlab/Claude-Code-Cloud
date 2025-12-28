/**
 * Commands Settings API
 * Handles command configuration for projects
 */

import { apiClient } from './client';
import type {
  CommandDefinition,
  CommandsConfig,
  CommandsConfigResponse,
  ToggleCommandResponse,
  CreateCustomCommandRequest,
  CreateCustomCommandResponse,
} from '@/types/command';

export const commandsApi = {
  /**
   * Get list of all available commands
   */
  getAvailableCommands: (): Promise<CommandDefinition[]> => {
    return apiClient.get<CommandDefinition[]>('/api/commands/available');
  },

  /**
   * Get commands configuration for a project
   */
  getConfig: (projectId: string): Promise<CommandsConfigResponse> => {
    return apiClient.get<CommandsConfigResponse>(`/api/commands/projects/${projectId}/config`);
  },

  /**
   * Update commands configuration for a project
   */
  updateConfig: (projectId: string, config: CommandsConfig): Promise<CommandsConfigResponse> => {
    return apiClient.put<CommandsConfigResponse>(`/api/commands/projects/${projectId}/config`, { config });
  },

  /**
   * Toggle a specific command's enabled status
   */
  toggleCommand: (projectId: string, commandName: string, enabled: boolean): Promise<ToggleCommandResponse> => {
    return apiClient.patch<ToggleCommandResponse>(
      `/api/commands/projects/${projectId}/commands/${commandName}`,
      { enabled }
    );
  },

  /**
   * Reset commands configuration to defaults
   */
  resetConfig: (projectId: string): Promise<CommandsConfigResponse> => {
    return apiClient.post<CommandsConfigResponse>(`/api/commands/projects/${projectId}/reset`, {});
  },

  /**
   * Create a custom command file
   */
  createCustomCommand: (projectId: string, request: CreateCustomCommandRequest): Promise<CreateCustomCommandResponse> => {
    return apiClient.post<CreateCustomCommandResponse>(`/api/commands/projects/${projectId}/custom`, request);
  },
};
