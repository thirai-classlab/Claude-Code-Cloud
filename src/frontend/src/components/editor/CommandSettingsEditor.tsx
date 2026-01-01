/**
 * Command Settings Editor Component
 * Manages command configurations per project using DB-based API
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { projectConfigApi } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { confirm } from '@/stores/confirmStore';
import type {
  ProjectCommand,
  CreateProjectCommandRequest,
  UpdateProjectCommandRequest,
} from '@/types/projectConfig';
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  normalizeCategory,
  parseMarkdownWithFrontmatter,
  ToggleSwitch,
  type EditorCategory,
} from './shared';

interface CommandSettingsEditorProps {
  projectId: string;
}

// Default form state for creating commands
const getDefaultCommandForm = (): CreateProjectCommandRequest => ({
  name: '',
  description: '',
  category: 'custom',
  content: '',
  enabled: true,
});

export const CommandSettingsEditor: React.FC<CommandSettingsEditorProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [commands, setCommands] = useState<ProjectCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<EditorCategory>>(
    new Set(CATEGORY_ORDER)
  );

  // Create command modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCommandForm, setNewCommandForm] = useState<CreateProjectCommandRequest>(getDefaultCommandForm());
  const [isCreating, setIsCreating] = useState(false);

  // Edit command modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<ProjectCommand | null>(null);
  const [editCommandForm, setEditCommandForm] = useState<UpdateProjectCommandRequest>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [deletingCommandId, setDeletingCommandId] = useState<string | null>(null);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMarkdownText, setImportMarkdownText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const commandsList = await projectConfigApi.listCommands(projectId);
      setCommands(commandsList);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load command configuration';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleCommand = async (command: ProjectCommand) => {
    const newEnabled = !command.enabled;

    // Optimistic update
    setCommands((prev) =>
      prev.map((c) => (c.id === command.id ? { ...c, enabled: newEnabled } : c))
    );

    try {
      setIsSaving(true);
      await projectConfigApi.updateCommand(projectId, command.id, { enabled: newEnabled });
      toast.success(`${command.name} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      // Revert on error
      setCommands((prev) =>
        prev.map((c) => (c.id === command.id ? { ...c, enabled: !newEnabled } : c))
      );
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle command';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: EditorCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCommand = async () => {
    if (!newCommandForm.name) {
      toast.warning('Name is required');
      return;
    }

    try {
      setIsCreating(true);
      const createdCommand = await projectConfigApi.createCommand(projectId, newCommandForm);
      setCommands((prev) => [...prev, createdCommand]);
      toast.success(`Command "${createdCommand.name}" created successfully`);
      setIsCreateModalOpen(false);
      setNewCommandForm(getDefaultCommandForm());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create command';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (command: ProjectCommand) => {
    setEditingCommand(command);
    setEditCommandForm({
      name: command.name,
      description: command.description || '',
      category: command.category,
      content: command.content || '',
      enabled: command.enabled,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCommand = async () => {
    if (!editingCommand) return;

    try {
      setIsUpdating(true);
      const updatedCommand = await projectConfigApi.updateCommand(
        projectId,
        editingCommand.id,
        editCommandForm
      );
      setCommands((prev) =>
        prev.map((c) => (c.id === editingCommand.id ? updatedCommand : c))
      );
      toast.success(`Command "${updatedCommand.name}" updated successfully`);
      setIsEditModalOpen(false);
      setEditingCommand(null);
      setEditCommandForm({});
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update command';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCommand = async (commandId: string) => {
    const command = commands.find((c) => c.id === commandId);
    if (!command) return;

    const confirmed = await confirm({
      title: t('editor.commands.deleteTitle'),
      message: t('editor.commands.confirmDelete', { name: command.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setDeletingCommandId(commandId);
      await projectConfigApi.deleteCommand(projectId, commandId);
      setCommands((prev) => prev.filter((c) => c.id !== commandId));
      toast.success(`Command "${command.name}" deleted successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete command';
      toast.error(errorMessage);
    } finally {
      setDeletingCommandId(null);
    }
  };

  // Handle import markdown
  const handleImportMarkdown = async () => {
    if (!importMarkdownText.trim()) {
      setImportError('Please paste Markdown content');
      return;
    }

    setImportError(null);
    setIsImporting(true);

    try {
      const parsed = parseMarkdownWithFrontmatter(importMarkdownText);

      if (!parsed) {
        setImportError('Invalid Markdown format. Please include YAML frontmatter with --- delimiters.');
        setIsImporting(false);
        return;
      }

      const { meta, content } = parsed;

      // Validate required fields
      if (!meta.name || typeof meta.name !== 'string') {
        setImportError('Missing required field: name');
        setIsImporting(false);
        return;
      }

      // Build command data
      const commandData: CreateProjectCommandRequest = {
        name: meta.name,
        description: typeof meta.description === 'string' ? meta.description : undefined,
        category: typeof meta.category === 'string' ? meta.category : 'custom',
        content: content || undefined,
        enabled: typeof meta.enabled === 'boolean' ? meta.enabled : true,
      };

      // Create the command
      const createdCommand = await projectConfigApi.createCommand(projectId, commandData);
      setCommands((prev) => [...prev, createdCommand]);
      toast.success(`Command "${createdCommand.name}" imported successfully`);

      // Close modal
      setIsImportModalOpen(false);
      setImportMarkdownText('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setImportError(`Failed to import: ${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportMarkdownText('');
    setImportError(null);
  };

  // Group commands by category
  const commandsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = commands.filter((c) => normalizeCategory(c.category) === category);
      return acc;
    },
    {} as Record<EditorCategory, ProjectCommand[]>
  );

  // Calculate stats
  const enabledCount = commands.filter((c) => c.enabled).length;
  const totalCount = commands.length;

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('editor.commands.title')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('editor.commands.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {enabledCount} / {totalCount} {t('editor.commands.enabled')}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)}>
                {t('editor.commands.importMarkdown')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                {t('editor.commands.createCommand')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {commands.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-text-secondary mb-2">{t('editor.commands.noCommands')}</p>
            <p className="text-text-tertiary text-sm mb-4">{t('editor.commands.createFirst')}</p>
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              {t('editor.commands.createCommand')}
            </Button>
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const categoryCommands = commandsByCategory[category];
            if (categoryCommands.length === 0) return null;

            const categoryConfig = CATEGORY_CONFIG[category];
            const isExpanded = expandedCategories.has(category);
            const enabledInCategory = categoryCommands.filter((c) => c.enabled).length;

            return (
              <div
                key={category}
                className="rounded-lg border border-border bg-bg-secondary overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      {categoryConfig.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-text-primary">{categoryConfig.label}</h3>
                      <p className="text-xs text-text-tertiary">
                        {enabledInCategory} / {categoryCommands.length} enabled
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-text-tertiary transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Command List */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {categoryCommands.map((command) => (
                      <div
                        key={command.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm font-mono">
                              /{command.name}
                            </h4>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {command.description || 'No description'}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(command)}
                            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                            title="Edit command"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteCommand(command.id)}
                            disabled={deletingCommandId === command.id}
                            className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Delete command"
                          >
                            {deletingCommandId === command.id ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>

                          {/* Toggle Switch */}
                          <ToggleSwitch
                            checked={command.enabled}
                            onChange={() => handleToggleCommand(command)}
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Command Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">{t('editor.commands.createCommand')}</h3>
              <p className="text-sm text-text-tertiary mt-1">
                Define a new slash command for this project
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.commandName')} *
                </label>
                <input
                  type="text"
                  value={newCommandForm.name}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, name: e.target.value })}
                  placeholder="my-command"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-xs text-text-tertiary mt-1">Will be invoked as /{newCommandForm.name || 'command-name'}</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.description')}
                </label>
                <textarea
                  value={newCommandForm.description || ''}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, description: e.target.value })}
                  placeholder="A command that..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.category')}
                </label>
                <select
                  value={newCommandForm.category || 'custom'}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.content')}
                </label>
                <textarea
                  value={newCommandForm.content || ''}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, content: e.target.value })}
                  placeholder="Enter the command script or prompt content..."
                  rows={8}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
                />
                <p className="text-xs text-text-tertiary mt-1">The content/prompt that will be executed when the command is invoked</p>
              </div>

              {/* Enabled */}
              <ToggleSwitch
                checked={newCommandForm.enabled ?? true}
                onChange={(checked) => setNewCommandForm({ ...newCommandForm, enabled: checked })}
                label={t('editor.commands.enabled')}
              />
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewCommandForm(getDefaultCommandForm());
                }}
                disabled={isCreating}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateCommand}
                disabled={isCreating || !newCommandForm.name}
              >
                {isCreating ? t('common.loading') : t('editor.commands.createCommand')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Command Modal */}
      {isEditModalOpen && editingCommand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">{t('editor.commands.editCommand')}</h3>
              <p className="text-sm text-text-tertiary mt-1">
                Modify command configuration
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.commandName')} *
                </label>
                <input
                  type="text"
                  value={editCommandForm.name || ''}
                  onChange={(e) => setEditCommandForm({ ...editCommandForm, name: e.target.value })}
                  placeholder="my-command"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-xs text-text-tertiary mt-1">Will be invoked as /{editCommandForm.name || 'command-name'}</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.description')}
                </label>
                <textarea
                  value={editCommandForm.description || ''}
                  onChange={(e) => setEditCommandForm({ ...editCommandForm, description: e.target.value })}
                  placeholder="A command that..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.category')}
                </label>
                <select
                  value={editCommandForm.category || 'custom'}
                  onChange={(e) => setEditCommandForm({ ...editCommandForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.commands.content')}
                </label>
                <textarea
                  value={editCommandForm.content || ''}
                  onChange={(e) => setEditCommandForm({ ...editCommandForm, content: e.target.value })}
                  placeholder="Enter the command script or prompt content..."
                  rows={8}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
                />
                <p className="text-xs text-text-tertiary mt-1">The content/prompt that will be executed when the command is invoked</p>
              </div>

              {/* Enabled */}
              <ToggleSwitch
                checked={editCommandForm.enabled ?? true}
                onChange={(checked) => setEditCommandForm({ ...editCommandForm, enabled: checked })}
                label={t('editor.commands.enabled')}
              />
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCommand(null);
                  setEditCommandForm({});
                }}
                disabled={isUpdating}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateCommand}
                disabled={isUpdating || !editCommandForm.name}
              >
                {isUpdating ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Markdown Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{t('editor.commands.importMarkdown')}</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Paste command definition with YAML frontmatter
                </p>
              </div>
              <button
                onClick={handleCloseImportModal}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {importError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-400 whitespace-pre-wrap">{importError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Markdown Content
                </label>
                <textarea
                  value={importMarkdownText}
                  onChange={(e) => setImportMarkdownText(e.target.value)}
                  placeholder='Paste your Markdown here...'
                  rows={12}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
                />
              </div>

              <div className="text-sm text-text-tertiary">
                <p className="font-medium text-text-secondary mb-2">Expected format:</p>
                <div className="bg-bg-secondary rounded-md p-3 font-mono text-xs overflow-x-auto">
                  <pre>{`---
name: my-command
description: Description of the command
category: development
enabled: true
---

Command content/script here...`}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseImportModal}
                disabled={isImporting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportMarkdown}
                disabled={isImporting || !importMarkdownText.trim()}
              >
                {isImporting ? t('common.loading') : t('editor.commands.importMarkdown')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
