/**
 * CreateProjectModal Component
 * Modal dialog for creating a new project with optional template selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/atoms';
import { templatesApi } from '@/lib/api/templates';
import { toast } from '@/stores/toastStore';
import type { TemplateListItem } from '@/types/template';
import type { Project } from '@/types/project';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; api_key?: string }) => Promise<void>;
  onProjectCreated?: (project: Project) => void;
  selectedTemplateId?: string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onProjectCreated,
  selectedTemplateId,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template selection (radio button style: 'blank' or 'template')
  const [projectType, setProjectType] = useState<'blank' | 'template'>('blank');
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const data = await templatesApi.list({ include_public: true });
      setTemplates(data);

      // Pre-select template if ID is provided
      if (selectedTemplateId) {
        const template = data.find((t) => t.id === selectedTemplateId);
        if (template) {
          setSelectedTemplate(template);
          setProjectType('template');
        }
      }
    } catch {
      // Silently fail - templates are optional
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning(t('modal.projectNameRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (projectType === 'template' && selectedTemplate) {
        // Create from template
        const project = await templatesApi.createProject({
          template_id: selectedTemplate.id,
          project_name: name.trim(),
          project_description: description.trim() || undefined,
          api_key: apiKey.trim() || undefined,
        });
        onProjectCreated?.(project);
        resetForm();
        onClose();
      } else {
        // Create blank project
        await onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          api_key: apiKey.trim() || undefined,
        });
        resetForm();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setApiKey('');
    setShowApiKey(false);
    setProjectType('blank');
    setSelectedTemplate(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSelectTemplate = (template: TemplateListItem | null) => {
    setSelectedTemplate(template);
    if (template && !name) {
      // Auto-fill name based on template
      setName(`${template.name} Project`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modal.newProject')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Type Selection (Radio Button Style) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            {t('modal.projectType')}
          </label>
          <div className="flex flex-col gap-2">
            {/* Blank Project Option */}
            <label
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                projectType === 'blank'
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-bg-secondary hover:border-border-hover'
              }`}
            >
              <input
                type="radio"
                name="projectType"
                value="blank"
                checked={projectType === 'blank'}
                onChange={() => {
                  setProjectType('blank');
                  setSelectedTemplate(null);
                }}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  projectType === 'blank'
                    ? 'border-accent'
                    : 'border-text-tertiary'
                }`}
              >
                {projectType === 'blank' && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </span>
              <div className="flex-1">
                <span className="font-medium text-text-primary text-sm">
                  {t('modal.blankProject')}
                </span>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {t('modal.blankProjectDesc')}
                </p>
              </div>
            </label>

            {/* Template Option */}
            <label
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                projectType === 'template'
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-bg-secondary hover:border-border-hover'
              }`}
            >
              <input
                type="radio"
                name="projectType"
                value="template"
                checked={projectType === 'template'}
                onChange={() => setProjectType('template')}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  projectType === 'template'
                    ? 'border-accent'
                    : 'border-text-tertiary'
                }`}
              >
                {projectType === 'template' && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </span>
              <div className="flex-1">
                <span className="font-medium text-text-primary text-sm">
                  {t('modal.fromTemplate')}
                </span>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {t('modal.fromTemplateDesc')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Template Selector */}
        {projectType === 'template' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              {t('modal.selectTemplate')}
            </label>
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary text-sm border border-border rounded-md">
                {t('modal.noTemplates')}
              </div>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto p-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-bg-secondary hover:border-border-hover'
                    }`}
                  >
                    <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary text-sm truncate">
                          {template.name}
                        </span>
                        {template.is_public && (
                          <span className="text-xs text-accent">{t('modal.public')}</span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                          {template.description}
                        </p>
                      )}
                      <div className="flex gap-2 text-xs text-text-tertiary mt-1">
                        {template.file_count > 0 && <span>{template.file_count} {t('modal.files')}</span>}
                        {template.mcp_server_count > 0 && (
                          <span>{template.mcp_server_count} MCP</span>
                        )}
                        {template.agent_count > 0 && <span>{template.agent_count} {t('modal.agents')}</span>}
                      </div>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <svg
                        className="w-5 h-5 text-accent flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Name */}
        <div>
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            {t('modal.projectName')} *
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('modal.projectNamePlaceholder')}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        {/* Project Description */}
        <div>
          <label
            htmlFor="project-description"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            {t('modal.descriptionOptional')}
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('modal.descriptionPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* API Key */}
        <div>
          <label
            htmlFor="project-api-key"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            {t('modal.apiKeyOptional')}
          </label>
          <div className="relative">
            <input
              id="project-api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('modal.apiKeyPlaceholder')}
              className="w-full px-3 py-2 pr-10 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors font-mono text-sm"
              disabled={isSubmitting}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary transition-colors"
              tabIndex={-1}
            >
              {showApiKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
            {t('modal.apiKeyHint')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {projectType === 'template' && selectedTemplate ? t('modal.createFromTemplate') : t('project.createProject')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
