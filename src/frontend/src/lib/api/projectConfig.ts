/**
 * Project Config API Client
 * Handles MCP Server, Agent, Skill, Command CRUD operations
 */

import { apiClient } from './client';
import {
  ProjectMCPServer,
  CreateProjectMCPServerRequest,
  UpdateProjectMCPServerRequest,
  ProjectAgent,
  CreateProjectAgentRequest,
  UpdateProjectAgentRequest,
  ProjectSkill,
  CreateProjectSkillRequest,
  UpdateProjectSkillRequest,
  ProjectCommand,
  CreateProjectCommandRequest,
  UpdateProjectCommandRequest,
  ProjectConfigResponse,
  MCPTool,
  MCPTestResponse,
  MCPToolsResponse,
} from '@/types/projectConfig';

// ============================================
// API Client
// ============================================

export const projectConfigApi = {
  // ============================================
  // MCP Servers
  // ============================================

  /**
   * List all MCP servers for a project
   */
  async listMCPServers(projectId: string): Promise<ProjectMCPServer[]> {
    return apiClient.get<ProjectMCPServer[]>(
      `/api/projects/${projectId}/mcp-servers`
    );
  },

  /**
   * Get a single MCP server
   */
  async getMCPServer(projectId: string, mcpId: string): Promise<ProjectMCPServer> {
    return apiClient.get<ProjectMCPServer>(
      `/api/projects/${projectId}/mcp-servers/${mcpId}`
    );
  },

  /**
   * Create a new MCP server
   */
  async createMCPServer(
    projectId: string,
    data: CreateProjectMCPServerRequest
  ): Promise<ProjectMCPServer> {
    return apiClient.post<ProjectMCPServer>(
      `/api/projects/${projectId}/mcp-servers`,
      data
    );
  },

  /**
   * Update an MCP server
   */
  async updateMCPServer(
    projectId: string,
    mcpId: string,
    data: UpdateProjectMCPServerRequest
  ): Promise<ProjectMCPServer> {
    return apiClient.put<ProjectMCPServer>(
      `/api/projects/${projectId}/mcp-servers/${mcpId}`,
      data
    );
  },

  /**
   * Delete an MCP server
   */
  async deleteMCPServer(projectId: string, mcpId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${projectId}/mcp-servers/${mcpId}`
    );
  },

  /**
   * Test MCP server connection and retrieve available tools
   */
  async testMCPServer(projectId: string, mcpId: string): Promise<MCPTestResponse> {
    return apiClient.post<MCPTestResponse>(
      `/api/projects/${projectId}/mcp-servers/${mcpId}/test`
    );
  },

  /**
   * Get available tools for an MCP server
   */
  async getMCPTools(projectId: string, mcpId: string): Promise<MCPTool[]> {
    const response = await apiClient.get<MCPToolsResponse>(
      `/api/projects/${projectId}/mcp-servers/${mcpId}/tools`
    );
    return response.tools;
  },

  // ============================================
  // Agents
  // ============================================

  /**
   * List all agents for a project
   */
  async listAgents(projectId: string): Promise<ProjectAgent[]> {
    return apiClient.get<ProjectAgent[]>(
      `/api/projects/${projectId}/agents`
    );
  },

  /**
   * Get a single agent
   */
  async getAgent(projectId: string, agentId: string): Promise<ProjectAgent> {
    return apiClient.get<ProjectAgent>(
      `/api/projects/${projectId}/agents/${agentId}`
    );
  },

  /**
   * Create a new agent
   */
  async createAgent(
    projectId: string,
    data: CreateProjectAgentRequest
  ): Promise<ProjectAgent> {
    return apiClient.post<ProjectAgent>(
      `/api/projects/${projectId}/agents`,
      data
    );
  },

  /**
   * Update an agent
   */
  async updateAgent(
    projectId: string,
    agentId: string,
    data: UpdateProjectAgentRequest
  ): Promise<ProjectAgent> {
    return apiClient.put<ProjectAgent>(
      `/api/projects/${projectId}/agents/${agentId}`,
      data
    );
  },

  /**
   * Delete an agent
   */
  async deleteAgent(projectId: string, agentId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${projectId}/agents/${agentId}`
    );
  },

  // ============================================
  // Skills
  // ============================================

  /**
   * List all skills for a project
   */
  async listSkills(projectId: string): Promise<ProjectSkill[]> {
    return apiClient.get<ProjectSkill[]>(
      `/api/projects/${projectId}/skills`
    );
  },

  /**
   * Get a single skill
   */
  async getSkill(projectId: string, skillId: string): Promise<ProjectSkill> {
    return apiClient.get<ProjectSkill>(
      `/api/projects/${projectId}/skills/${skillId}`
    );
  },

  /**
   * Create a new skill
   */
  async createSkill(
    projectId: string,
    data: CreateProjectSkillRequest
  ): Promise<ProjectSkill> {
    return apiClient.post<ProjectSkill>(
      `/api/projects/${projectId}/skills`,
      data
    );
  },

  /**
   * Update a skill
   */
  async updateSkill(
    projectId: string,
    skillId: string,
    data: UpdateProjectSkillRequest
  ): Promise<ProjectSkill> {
    return apiClient.put<ProjectSkill>(
      `/api/projects/${projectId}/skills/${skillId}`,
      data
    );
  },

  /**
   * Delete a skill
   */
  async deleteSkill(projectId: string, skillId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${projectId}/skills/${skillId}`
    );
  },

  // ============================================
  // Commands
  // ============================================

  /**
   * List all commands for a project
   */
  async listCommands(projectId: string): Promise<ProjectCommand[]> {
    return apiClient.get<ProjectCommand[]>(
      `/api/projects/${projectId}/commands`
    );
  },

  /**
   * Get a single command
   */
  async getCommand(projectId: string, commandId: string): Promise<ProjectCommand> {
    return apiClient.get<ProjectCommand>(
      `/api/projects/${projectId}/commands/${commandId}`
    );
  },

  /**
   * Create a new command
   */
  async createCommand(
    projectId: string,
    data: CreateProjectCommandRequest
  ): Promise<ProjectCommand> {
    return apiClient.post<ProjectCommand>(
      `/api/projects/${projectId}/commands`,
      data
    );
  },

  /**
   * Update a command
   */
  async updateCommand(
    projectId: string,
    commandId: string,
    data: UpdateProjectCommandRequest
  ): Promise<ProjectCommand> {
    return apiClient.put<ProjectCommand>(
      `/api/projects/${projectId}/commands/${commandId}`,
      data
    );
  },

  /**
   * Delete a command
   */
  async deleteCommand(projectId: string, commandId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${projectId}/commands/${commandId}`
    );
  },

  // ============================================
  // Aggregate Config
  // ============================================

  /**
   * Get all project configuration (MCP servers, agents, skills, commands)
   */
  async getConfig(projectId: string): Promise<ProjectConfigResponse> {
    return apiClient.get<ProjectConfigResponse>(
      `/api/projects/${projectId}/config`
    );
  },
};
