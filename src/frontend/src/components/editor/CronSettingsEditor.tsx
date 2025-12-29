/**
 * Cron Settings Editor Component
 * Allows editing cron schedule configurations
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/atoms';
import { cronApi } from '@/lib/api/cron';
import {
  CronScheduleResponse,
  CronScheduleCreateRequest,
  CRON_PRESETS,
  TIMEZONES,
} from '@/types/cron';

interface CronSettingsEditorProps {
  projectId: string;
}

interface ScheduleFormData {
  name: string;
  command: string;
  cron: string;
  description: string;
  enabled: boolean;
  timezone: string;
  args: string;
}

const emptyScheduleForm: ScheduleFormData = {
  name: '',
  command: '',
  cron: '',
  description: '',
  enabled: true,
  timezone: 'Asia/Tokyo',
  args: '',
};

export const CronSettingsEditor: React.FC<CronSettingsEditorProps> = ({ projectId }) => {
  const [schedules, setSchedules] = useState<CronScheduleResponse[]>([]);
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(emptyScheduleForm);

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cronApi.getSchedules(projectId);
      setSchedules(response.schedules);
      setConfigPath(response.path);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cron schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const parseArgsString = (argsStr: string): Record<string, unknown> => {
    if (!argsStr.trim()) return {};
    try {
      return JSON.parse(argsStr);
    } catch {
      return {};
    }
  };


  const handleAddSchedule = () => {
    setIsAddingSchedule(true);
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm);
  };

  const handleEditSchedule = (schedule: CronScheduleResponse) => {
    setEditingSchedule(schedule.name);
    setIsAddingSchedule(false);
    setScheduleForm({
      name: schedule.name,
      command: schedule.command,
      cron: schedule.cron,
      description: schedule.description,
      enabled: schedule.enabled,
      timezone: schedule.timezone,
      args: '',
    });
  };

  const handleDeleteSchedule = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the schedule "${name}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      await cronApi.deleteSchedule(projectId, name);
      setSchedules(schedules.filter(s => s.name !== name));
      showSuccess(`Schedule "${name}" deleted successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete schedule';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSchedule = async (name: string) => {
    try {
      setIsSaving(true);
      const updatedSchedule = await cronApi.toggleSchedule(projectId, name);
      setSchedules(schedules.map(s =>
        s.name === name ? updatedSchedule : s
      ));
      showSuccess(`Schedule "${name}" ${updatedSchedule.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle schedule';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async (name: string) => {
    try {
      setIsSaving(true);
      await cronApi.runScheduleNow(projectId, name);
      showSuccess(`Schedule "${name}" triggered successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run schedule';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.name.trim() || !scheduleForm.command.trim() || !scheduleForm.cron.trim()) {
      setError('Schedule name, command, and cron expression are required');
      return;
    }

    const scheduleData: CronScheduleCreateRequest = {
      name: scheduleForm.name.trim(),
      command: scheduleForm.command.trim(),
      cron: scheduleForm.cron.trim(),
      description: scheduleForm.description.trim(),
      enabled: scheduleForm.enabled,
      timezone: scheduleForm.timezone,
      args: parseArgsString(scheduleForm.args),
    };

    try {
      setIsSaving(true);
      setError(null);

      if (editingSchedule) {
        const { name, ...updateData } = scheduleData;
        const updatedSchedule = await cronApi.updateSchedule(projectId, editingSchedule, updateData);
        setSchedules(schedules.map(s =>
          s.name === editingSchedule ? updatedSchedule : s
        ));
        showSuccess('Schedule updated successfully');
      } else {
        const newSchedule = await cronApi.createSchedule(projectId, scheduleData);
        setSchedules([...schedules, newSchedule]);
        showSuccess('Schedule added successfully');
      }

      setIsAddingSchedule(false);
      setEditingSchedule(null);
      setScheduleForm(emptyScheduleForm);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save schedule';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAddingSchedule(false);
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm);
    setError(null);
  };

  const handlePresetSelect = (cronExpression: string) => {
    setScheduleForm({ ...scheduleForm, cron: cronExpression });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isFormOpen = isAddingSchedule || editingSchedule !== null;

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Cron Schedules</h2>
          <p className="text-xs text-text-tertiary mt-1 font-mono">{configPath}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddSchedule}
          disabled={isFormOpen}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Schedule
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add/Edit Form */}
        {isFormOpen && (
          <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {editingSchedule ? `Edit Schedule: ${editingSchedule}` : 'Add New Schedule'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  disabled={!!editingSchedule}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  placeholder="e.g., daily-backup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Command *
                </label>
                <input
                  type="text"
                  value={scheduleForm.command}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, command: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="e.g., /sc:analyze, /sc:build"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Cron Expression *
                </label>
                <input
                  type="text"
                  value={scheduleForm.cron}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, cron: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="e.g., 0 9 * * * (minute hour day month weekday)"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {CRON_PRESETS.slice(0, 6).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset.cron)}
                      className="px-2 py-1 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-primary/10 hover:text-primary transition-colors"
                      title={preset.cron}
                    >
                      {preset.description}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Daily code analysis at 9 AM"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Timezone
                  </label>
                  <select
                    value={scheduleForm.timezone}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.enabled}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <span className="text-sm text-text-secondary">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : (editingSchedule ? 'Update' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule List */}
        {schedules.length === 0 && !isFormOpen ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-text-secondary mb-2">No Cron Schedules</h3>
            <p className="text-text-tertiary mb-4">
              Add cron schedules to automate command execution on a regular basis.
            </p>
            <Button variant="primary" onClick={handleAddSchedule}>
              Add Your First Schedule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const isEditing = editingSchedule === schedule.name;

              return (
                <div
                  key={schedule.name}
                  className={`p-4 rounded-lg border transition-colors ${
                    isEditing
                      ? 'border-primary bg-primary/5'
                      : schedule.enabled
                        ? 'border-border bg-bg-secondary hover:border-border-hover'
                        : 'border-border bg-bg-tertiary/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${
                          schedule.enabled ? 'bg-primary/10' : 'bg-bg-tertiary'
                        }`}>
                          <svg className={`w-4 h-4 ${schedule.enabled ? 'text-primary' : 'text-text-tertiary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-text-primary">{schedule.name}</h4>
                          {schedule.description && (
                            <p className="text-xs text-text-tertiary">{schedule.description}</p>
                          )}
                        </div>
                        {!schedule.enabled && (
                          <span className="px-2 py-0.5 text-xs bg-bg-tertiary text-text-tertiary rounded">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-text-tertiary w-20 flex-shrink-0">Command:</span>
                          <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                            {schedule.command}
                          </code>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-text-tertiary w-20 flex-shrink-0">Schedule:</span>
                          <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                            {schedule.cron}
                          </code>
                          <span className="text-text-tertiary text-xs">({schedule.timezone})</span>
                        </div>
                        {schedule.next_run && (
                          <div className="flex items-start gap-2">
                            <span className="text-text-tertiary w-20 flex-shrink-0">Next run:</span>
                            <span className="text-text-secondary text-xs">
                              {new Date(schedule.next_run).toLocaleString('ja-JP')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleRunNow(schedule.name)}
                        disabled={isSaving || !schedule.enabled}
                        className="p-2 text-text-secondary hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Run Now"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleSchedule(schedule.name)}
                        disabled={isSaving}
                        className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          schedule.enabled
                            ? 'text-text-secondary hover:text-orange-600 hover:bg-orange-50'
                            : 'text-text-tertiary hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={schedule.enabled ? 'Disable' : 'Enable'}
                      >
                        {schedule.enabled ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        disabled={isFormOpen && !isEditing}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.name)}
                        disabled={isSaving}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
