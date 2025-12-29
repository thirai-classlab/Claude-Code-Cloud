/**
 * API Client Index
 * Exports all API modules
 */

export { apiClient } from './client';
export type { ApiError } from './client';

export { authApi } from './auth';
export type { LoginResponse, RegisterRequest, User as AuthUser } from './auth';

export { projectsApi } from './projects';
export type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse,
  SessionsResponse,
  CreateSessionRequest,
  ListProjectsParams,
} from './projects';

export { sessionsApi } from './sessions';
export type {
  UpdateSessionRequest,
  MessagesResponse,
  ApiChatMessage,
} from './sessions';

export { mcpApi } from './mcp';
export type {
  MCPServerConfig,
  MCPConfig,
  MCPConfigResponse,
  UpdateMCPConfigRequest,
} from './mcp';

export { agentsApi } from './agents';
export { commandsApi } from './commands';
export { skillsApi } from './skills';
export { cronApi } from './cron';
export { projectConfigApi } from './projectConfig';
export type {
  SkillsConfig,
  SkillsConfigResponse,
  SkillDefinition,
} from '@/types/skill';
export type {
  CronSchedule,
  CronScheduleWithName,
  CronConfig,
  CronScheduleCreateRequest,
  CronScheduleUpdateRequest,
  CronScheduleResponse,
  CronConfigResponse,
  CronExecutionLog,
  CronPreset,
} from '@/types/cron';
export type {
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
} from '@/types/projectConfig';
