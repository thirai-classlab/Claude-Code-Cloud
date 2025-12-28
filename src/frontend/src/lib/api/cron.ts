/**
 * Cron Schedule API
 * Handles cron schedule configuration for projects
 */

import { apiClient } from './client';
import type {
  CronConfigResponse,
  CronScheduleResponse,
  CronScheduleCreateRequest,
  CronScheduleUpdateRequest,
  CronExecutionLog,
  CronPreset,
} from '@/types/cron';

export const cronApi = {
  /**
   * Get all cron schedules for a project
   */
  getSchedules: (projectId: string): Promise<CronConfigResponse> => {
    return apiClient.get<CronConfigResponse>(`/api/cron/projects/${projectId}/schedules`);
  },

  /**
   * Create a new cron schedule
   */
  createSchedule: (
    projectId: string,
    schedule: CronScheduleCreateRequest
  ): Promise<CronScheduleResponse> => {
    return apiClient.post<CronScheduleResponse>(
      `/api/cron/projects/${projectId}/schedules`,
      schedule
    );
  },

  /**
   * Update an existing cron schedule
   */
  updateSchedule: (
    projectId: string,
    scheduleName: string,
    updates: CronScheduleUpdateRequest
  ): Promise<CronScheduleResponse> => {
    return apiClient.put<CronScheduleResponse>(
      `/api/cron/projects/${projectId}/schedules/${scheduleName}`,
      updates
    );
  },

  /**
   * Delete a cron schedule
   */
  deleteSchedule: (
    projectId: string,
    scheduleName: string
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/api/cron/projects/${projectId}/schedules/${scheduleName}`
    );
  },

  /**
   * Toggle a schedule's enabled status
   */
  toggleSchedule: (
    projectId: string,
    scheduleName: string
  ): Promise<CronScheduleResponse> => {
    return apiClient.post<CronScheduleResponse>(
      `/api/cron/projects/${projectId}/schedules/${scheduleName}/toggle`
    );
  },

  /**
   * Manually run a scheduled command immediately
   */
  runScheduleNow: (
    projectId: string,
    scheduleName: string
  ): Promise<{ message: string; status: string }> => {
    return apiClient.post<{ message: string; status: string }>(
      `/api/cron/projects/${projectId}/schedules/${scheduleName}/run`
    );
  },

  /**
   * Get execution logs for a project
   */
  getExecutionLogs: (
    projectId: string,
    limit: number = 50
  ): Promise<CronExecutionLog[]> => {
    return apiClient.get<CronExecutionLog[]>(
      `/api/cron/projects/${projectId}/logs?limit=${limit}`
    );
  },

  /**
   * Reload schedules from .cron.json file
   */
  reloadSchedules: (projectId: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(
      `/api/cron/projects/${projectId}/reload`
    );
  },

  /**
   * Get common cron expression presets
   */
  getPresets: (): Promise<CronPreset[]> => {
    return apiClient.get<CronPreset[]>('/api/cron/presets');
  },
};
