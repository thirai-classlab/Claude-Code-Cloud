/**
 * Project Settings Editor Component
 * Allows editing project name, description, and API key
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { projectsApi } from '@/lib/api';
import { useProjects } from '@/hooks/useProjects';

interface ProjectSettingsEditorProps {
  projectId: string;
}

export const ProjectSettingsEditor: React.FC<ProjectSettingsEditorProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { updateProject: updateProjectInStore } = useProjects();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Original values for dirty checking
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalApiKey, setOriginalApiKey] = useState('');

  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const project = await projectsApi.get(projectId);
      setName(project.name);
      setDescription(project.description || '');
      setApiKey(project.api_key || '');
      setOriginalName(project.name);
      setOriginalDescription(project.description || '');
      setOriginalApiKey(project.api_key || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const isDirty = name !== originalName || description !== originalDescription || apiKey !== originalApiKey;

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('editor.projectSettings.projectNameRequired'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProject = await projectsApi.update(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        api_key: apiKey.trim() || undefined,
      });

      // Update local store
      updateProjectInStore(projectId, updatedProject);

      // Update original values
      setOriginalName(name.trim());
      setOriginalDescription(description.trim());
      setOriginalApiKey(apiKey.trim());

      showSuccess(t('editor.projectSettings.saveSuccess'));
    } catch (err: any) {
      setError(err.message || t('editor.projectSettings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setName(originalName);
    setDescription(originalDescription);
    setApiKey(originalApiKey);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">{t('editor.projectSettings.title')}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('editor.projectSettings.subtitle')}</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-md">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t('editor.projectSettings.projectName')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="My Project"
              maxLength={100}
            />
            <p className="text-xs text-text-tertiary mt-1">{name.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t('editor.projectSettings.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
              placeholder={t('editor.projectSettings.descriptionPlaceholder')}
              maxLength={500}
            />
            <p className="text-xs text-text-tertiary mt-1">{description.length}/500</p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t('editor.projectSettings.apiKey')}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 pr-12 bg-bg-secondary border border-border rounded-md text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                placeholder={t('editor.projectSettings.apiKeyPlaceholder')}
                maxLength={500}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                title={showApiKey ? t('editor.projectSettings.hide') : t('editor.projectSettings.show')}
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {t('editor.projectSettings.apiKeyHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || isSaving}
            >
              {t('editor.projectSettings.reset')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? t('editor.projectSettings.saving') : t('editor.projectSettings.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
