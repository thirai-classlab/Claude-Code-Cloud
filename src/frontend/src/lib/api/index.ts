/**
 * API Client Index
 * Exports all API modules
 */

export { apiClient } from './client';
export type { ApiError } from './client';

export { projectsApi } from './projects';
export type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse,
  SessionsResponse,
  CreateSessionRequest,
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
