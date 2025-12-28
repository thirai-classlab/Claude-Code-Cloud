/**
 * MCP Settings API
 * Handles MCP configuration for projects
 */

import { apiClient } from './client';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPConfigResponse {
  config: MCPConfig;
  path: string;
}

export interface UpdateMCPConfigRequest {
  config: MCPConfig;
}

export const mcpApi = {
  /**
   * Get MCP configuration for a project
   */
  getConfig: (projectId: string): Promise<MCPConfigResponse> => {
    return apiClient.get<MCPConfigResponse>(`/api/mcp/projects/${projectId}/config`);
  },

  /**
   * Update MCP configuration for a project
   */
  updateConfig: (projectId: string, config: MCPConfig): Promise<MCPConfigResponse> => {
    return apiClient.put<MCPConfigResponse>(`/api/mcp/projects/${projectId}/config`, { config });
  },

  /**
   * Delete a specific MCP server from configuration
   */
  deleteServer: (projectId: string, serverName: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/api/mcp/projects/${projectId}/servers/${serverName}`);
  },
};
