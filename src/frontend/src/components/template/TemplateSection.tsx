/**
 * TemplateSection Component
 * Displays template list and management UI on the home page
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { templatesApi } from '@/lib/api/templates';
import type { TemplateListItem, CreateTemplateRequest, UpdateTemplateRequest } from '@/types/template';

interface TemplateSectionProps {
  onSelectTemplate?: (template: TemplateListItem) => void;
}

export const TemplateSection: React.FC<TemplateSectionProps> = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await templatesApi.list({ include_public: true });
      setTemplates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = async (data: CreateTemplateRequest | UpdateTemplateRequest) => {
    try {
      // When creating, name is always provided from the form
      await templatesApi.create(data as CreateTemplateRequest);
      setIsCreateModalOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleUpdateTemplate = async (data: CreateTemplateRequest | UpdateTemplateRequest) => {
    if (!editingTemplate) return;
    try {
      await templatesApi.update(editingTemplate.id, data);
      setIsEditModalOpen(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleDeleteTemplate = async (template: TemplateListItem) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await templatesApi.delete(template.id);
      await loadTemplates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const openEditModal = (template: TemplateListItem) => {
    setEditingTemplate(template);
    setIsEditModalOpen(true);
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary">Templates</h2>
          <span className="text-sm text-text-tertiary">({templates.length})</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsCreateModalOpen(true);
          }}
        >
          + New Template
        </Button>
      </div>

      {/* Template Grid */}
      {isExpanded && (
        <div className="mt-4">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && templates.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              <p>No templates yet. Create one to get started!</p>
            </div>
          )}

          {/* Templates */}
          {!isLoading && !error && templates.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelectTemplate?.(template)}
                  onEdit={() => openEditModal(template)}
                  onDelete={() => handleDeleteTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <TemplateFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
        title="New Template"
      />

      {/* Edit Modal */}
      {editingTemplate && (
        <TemplateFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTemplate(null);
          }}
          onSubmit={handleUpdateTemplate}
          title="Edit Template"
          initialData={{
            name: editingTemplate.name,
            description: editingTemplate.description || '',
            is_public: editingTemplate.is_public,
          }}
        />
      )}
    </div>
  );
};

// ============================================
// Template Card
// ============================================

interface TemplateCardProps {
  template: TemplateListItem;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const configCount =
    template.mcp_server_count +
    template.agent_count +
    template.skill_count +
    template.command_count;

  return (
    <div
      className="group p-4 rounded-lg border border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary transition-all duration-200 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Template Icon */}
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-text-primary text-sm truncate max-w-[150px]">
              {template.name}
            </h3>
            {template.is_public && (
              <span className="text-xs text-accent">Public</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-1 hover:bg-bg-secondary rounded text-text-tertiary hover:text-text-primary"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 hover:bg-bg-secondary rounded text-text-tertiary hover:text-status-error"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {template.description && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-2">
          {template.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-xs text-text-tertiary">
        {template.file_count > 0 && (
          <span>{template.file_count} files</span>
        )}
        {configCount > 0 && (
          <span>{configCount} configs</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// Template Form Modal
// ============================================

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => Promise<void>;
  title: string;
  initialData?: {
    name: string;
    description: string;
    is_public: boolean;
  };
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setIsPublic(initialData?.is_public || false);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Template"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this template..."
            rows={3}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Public */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
            disabled={isSubmitting}
          />
          <label htmlFor="is_public" className="text-sm text-text-secondary">
            Make this template public
          </label>
        </div>

        {/* Error */}
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
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
