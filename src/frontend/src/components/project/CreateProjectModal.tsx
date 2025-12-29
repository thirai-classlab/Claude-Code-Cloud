/**
 * CreateProjectModal Component
 * Modal dialog for creating a new project with optional template selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/atoms';
import { templatesApi } from '@/lib/api/templates';
import type { TemplateListItem } from '@/types/template';
import type { Project } from '@/types/project';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template selection
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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
          setShowTemplateSelector(true);
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
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedTemplate) {
        // Create from template
        const project = await templatesApi.createProject({
          template_id: selectedTemplate.id,
          project_name: name.trim(),
          project_description: description.trim() || undefined,
        });
        onProjectCreated?.(project);
        resetForm();
        onClose();
      } else {
        // Create blank project
        await onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        resetForm();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedTemplate(null);
    setShowTemplateSelector(false);
    setError(null);
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
    <Modal isOpen={isOpen} onClose={handleClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setShowTemplateSelector(!showTemplateSelector);
              if (showTemplateSelector) {
                setSelectedTemplate(null);
              }
            }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showTemplateSelector
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-border-hover'
            }`}
          >
            {showTemplateSelector ? 'Using Template' : 'Blank Project'}
          </button>
          <span className="text-xs text-text-tertiary">
            {showTemplateSelector
              ? 'Select a template to start with pre-configured settings'
              : 'Start with a blank project'}
          </span>
        </div>

        {/* Template Selector */}
        {showTemplateSelector && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              Select Template
            </label>
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary text-sm border border-border rounded-md">
                No templates available. Create one from an existing project first.
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
                          <span className="text-xs text-accent">Public</span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                          {template.description}
                        </p>
                      )}
                      <div className="flex gap-2 text-xs text-text-tertiary mt-1">
                        {template.file_count > 0 && <span>{template.file_count} files</span>}
                        {template.mcp_server_count > 0 && (
                          <span>{template.mcp_server_count} MCP</span>
                        )}
                        {template.agent_count > 0 && <span>{template.agent_count} agents</span>}
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
            Project Name *
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Project"
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
            Description (Optional)
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project..."
            rows={3}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-md">
            <p className="text-sm text-status-error">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {selectedTemplate ? 'Create from Template' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
