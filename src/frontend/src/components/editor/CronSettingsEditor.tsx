/**
 * Cron Settings Editor Component
 * Allows editing cron schedule configurations
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { cronApi } from '@/lib/api/cron';
import {
  CronScheduleResponse,
  CronScheduleCreateRequest,
  CronExecutionLog,
  CRON_PRESETS,
  TIMEZONES,
} from '@/types/cron';

type TabType = 'schedules' | 'history';

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('schedules');
  const [schedules, setSchedules] = useState<CronScheduleResponse[]>([]);
  const [executionLogs, setExecutionLogs] = useState<CronExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cron schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadExecutionLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await cronApi.getExecutionLogs(projectId, 50);
      setExecutionLogs(logs);
    } catch (err: unknown) {
      console.error('Failed to load execution logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadExecutionLogs();
    }
  }, [activeTab, loadExecutionLogs]);

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
    if (!confirm(t('editor.cron.confirmDelete', { name }))) {
      return;
    }

    try {
      setIsSaving(true);
      await cronApi.deleteSchedule(projectId, name);
      setSchedules(schedules.filter(s => s.name !== name));
      showSuccess(t('editor.cron.scheduleDeleted', { name }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('common.error');
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
      showSuccess(updatedSchedule.enabled
        ? t('editor.cron.scheduleEnabled', { name })
        : t('editor.cron.scheduleDisabled', { name }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('common.error');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async (name: string) => {
    try {
      setIsSaving(true);
      await cronApi.runScheduleNow(projectId, name);
      showSuccess(t('editor.cron.scheduleTriggered', { name }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('common.error');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.name.trim() || !scheduleForm.command.trim() || !scheduleForm.cron.trim()) {
      setError(t('editor.cron.validationRequired'));
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
        showSuccess(t('editor.cron.scheduleUpdated'));
      } else {
        const newSchedule = await cronApi.createSchedule(projectId, scheduleData);
        setSchedules([...schedules, newSchedule]);
        showSuccess(t('editor.cron.scheduleAdded'));
      }

      setIsAddingSchedule(false);
      setEditingSchedule(null);
      setScheduleForm(emptyScheduleForm);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('common.error');
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
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('editor.cron.title')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('editor.cron.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {schedules.filter(s => s.enabled).length} / {schedules.length} {t('editor.cron.enabled')}
            </span>
            <div className="flex items-center gap-2">
              {activeTab === 'schedules' && (
                <Button variant="primary" size="sm" onClick={handleAddSchedule} disabled={isFormOpen}>
                  {t('editor.cron.addSchedule')}
                </Button>
              )}
              {activeTab === 'history' && (
                <Button variant="secondary" size="sm" onClick={loadExecutionLogs} disabled={isLoadingLogs}>
                  {t('editor.cron.refresh')}
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'schedules'
                ? 'bg-bg-secondary text-text-primary border border-b-0 border-border'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('editor.cron.schedules')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-bg-secondary text-text-primary border border-b-0 border-border'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('editor.cron.executionHistory')}
              {executionLogs.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-bg-tertiary text-text-tertiary rounded">
                  {executionLogs.length}
                </span>
              )}
            </div>
          </button>
        </div>
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
        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <>
        {/* Add/Edit Form */}
        {isFormOpen && (
          <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {editingSchedule ? `${t('editor.cron.editSchedule')}: ${editingSchedule}` : t('editor.cron.addNewSchedule')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.cron.scheduleName')} *
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
                  {t('editor.cron.command')} *
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
                  {t('editor.cron.cronExpression')} *
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
                  {t('editor.cron.description')}
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
                    {t('editor.cron.timezone')}
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
                    <span className="text-sm text-text-secondary">{t('editor.cron.enabled')}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={handleCancel}>
                  {t('editor.cron.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                >
                  {isSaving ? t('editor.cron.saving') : (editingSchedule ? t('editor.cron.update') : t('editor.cron.add'))}
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
            <h3 className="text-lg font-medium text-text-secondary mb-2">{t('editor.cron.noSchedules')}</h3>
            <p className="text-text-tertiary mb-4">
              {t('editor.cron.noSchedulesDescription')}
            </p>
            <Button variant="primary" onClick={handleAddSchedule}>
              {t('editor.cron.addFirst')}
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
                            {t('editor.cron.disabled')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-text-tertiary w-20 flex-shrink-0">{t('editor.cron.command')}:</span>
                          <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                            {schedule.command}
                          </code>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-text-tertiary w-20 flex-shrink-0">{t('editor.cron.schedules')}:</span>
                          <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                            {schedule.cron}
                          </code>
                          <span className="text-text-tertiary text-xs">({schedule.timezone})</span>
                        </div>
                        {schedule.next_run && (
                          <div className="flex items-start gap-2">
                            <span className="text-text-tertiary w-20 flex-shrink-0">{t('editor.cron.nextRun')}:</span>
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
                        title={t('editor.cron.runNow')}
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
                        title={schedule.enabled ? t('editor.cron.disable') : t('editor.cron.enable')}
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
                        title={t('editor.cron.edit')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.name)}
                        disabled={isSaving}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('editor.cron.delete')}
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
          </>
        )}

        {/* Execution History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : executionLogs.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-lg font-medium text-text-secondary mb-2">{t('editor.cron.noExecutionLogs')}</h3>
                <p className="text-text-tertiary">
                  {t('editor.cron.noExecutionLogsDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {executionLogs.map((log, index) => {
                  const startedAt = log.started_at ? new Date(log.started_at) : null;
                  const completedAt = log.completed_at ? new Date(log.completed_at) : null;
                  const duration = startedAt && completedAt
                    ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
                    : null;

                  return (
                    <div
                      key={`${log.schedule_name}-${log.started_at}-${index}`}
                      className={`p-4 rounded-lg border transition-colors ${
                        log.status === 'failed'
                          ? 'border-red-200 bg-red-50/50'
                          : log.status === 'running'
                            ? 'border-yellow-200 bg-yellow-50/50'
                            : 'border-border bg-bg-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {/* Status Icon */}
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              log.status === 'failed'
                                ? 'bg-red-100'
                                : log.status === 'running'
                                  ? 'bg-yellow-100'
                                  : 'bg-green-100'
                            }`}>
                              {log.status === 'failed' ? (
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              ) : log.status === 'running' ? (
                                <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-text-primary">{log.schedule_name}</h4>
                              {log.command && (
                                <code className="text-xs text-text-tertiary font-mono">{log.command}</code>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              log.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : log.status === 'running'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {log.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-4 text-text-tertiary">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>
                                  {startedAt ? startedAt.toLocaleString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  }) : '-'}
                                </span>
                              </div>
                              {duration !== null && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{duration}s</span>
                                </div>
                              )}
                            </div>

                            {/* Error message */}
                            {log.error && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm">
                                <p className="text-red-700 font-medium text-xs mb-1">{t('editor.cron.error')}:</p>
                                <pre className="text-red-600 text-xs whitespace-pre-wrap font-mono">{log.error}</pre>
                              </div>
                            )}

                            {/* Result */}
                            {log.result && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary text-xs">
                                  {t('editor.cron.viewResult')}
                                </summary>
                                <div className="mt-2 p-2 bg-bg-tertiary rounded text-xs">
                                  <pre className="text-text-secondary whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                                    {log.result}
                                  </pre>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
