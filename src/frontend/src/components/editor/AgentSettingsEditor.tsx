/**
 * Agent Settings Editor Component
 * Manages sub-agent configurations per project using DB-based API
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { projectConfigApi } from '@/lib/api';
import type {
  ProjectAgent,
  CreateProjectAgentRequest,
  UpdateProjectAgentRequest,
} from '@/types/projectConfig';
import { AGENT_MODEL_OPTIONS, AGENT_TOOL_OPTIONS } from '@/types/agent';
import type { AgentModel } from '@/types/agent';
import {
  CATEGORY_CONFIG,
  AGENT_CATEGORY_ORDER,
  normalizeCategory,
  parseMarkdownWithFrontmatter,
  ToggleSwitch,
  useSuccessMessage,
  type EditorCategory,
} from './shared';

interface AgentSettingsEditorProps {
  projectId: string;
}

// Default form state for creating/editing agents
const getDefaultAgentForm = (): CreateProjectAgentRequest => ({
  name: '',
  description: '',
  category: 'development',
  model: 'sonnet',
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  system_prompt: '',
  enabled: true,
});

export const AgentSettingsEditor: React.FC<AgentSettingsEditorProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<ProjectAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, showSuccess] = useSuccessMessage();
  const [expandedCategories, setExpandedCategories] = useState<Set<EditorCategory>>(
    new Set(AGENT_CATEGORY_ORDER)
  );

  // Create agent modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState<CreateProjectAgentRequest>(getDefaultAgentForm());
  const [isCreating, setIsCreating] = useState(false);

  // Edit agent modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ProjectAgent | null>(null);
  const [editAgentForm, setEditAgentForm] = useState<UpdateProjectAgentRequest>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMarkdownText, setImportMarkdownText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const agentsList = await projectConfigApi.listAgents(projectId);
      setAgents(agentsList);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agent configuration';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAgent = async (agent: ProjectAgent) => {
    const newEnabled = !agent.enabled;

    // Optimistic update
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, enabled: newEnabled } : a))
    );

    try {
      setIsSaving(true);
      await projectConfigApi.updateAgent(projectId, agent.id, { enabled: newEnabled });
      showSuccess(`${agent.name} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      // Revert on error
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, enabled: !newEnabled } : a))
      );
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent';
      setError(errorMessage);
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

  const handleCreateAgent = async () => {
    if (!newAgentForm.name) {
      setError('Name is required');
      return;
    }

    try {
      setIsCreating(true);
      const createdAgent = await projectConfigApi.createAgent(projectId, newAgentForm);
      setAgents((prev) => [...prev, createdAgent]);
      showSuccess(`Agent "${createdAgent.name}" created successfully`);
      setIsCreateModalOpen(false);
      setNewAgentForm(getDefaultAgentForm());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (agent: ProjectAgent) => {
    setEditingAgent(agent);
    setEditAgentForm({
      name: agent.name,
      description: agent.description || '',
      category: agent.category,
      model: agent.model,
      tools: agent.tools,
      system_prompt: agent.system_prompt || '',
      enabled: agent.enabled,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent) return;

    try {
      setIsUpdating(true);
      const updatedAgent = await projectConfigApi.updateAgent(
        projectId,
        editingAgent.id,
        editAgentForm
      );
      setAgents((prev) =>
        prev.map((a) => (a.id === editingAgent.id ? updatedAgent : a))
      );
      showSuccess(`Agent "${updatedAgent.name}" updated successfully`);
      setIsEditModalOpen(false);
      setEditingAgent(null);
      setEditAgentForm({});
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    try {
      setDeletingAgentId(agentId);
      await projectConfigApi.deleteAgent(projectId, agentId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      showSuccess(`Agent "${agent.name}" deleted successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleToolToggle = (
    tool: string,
    form: CreateProjectAgentRequest | UpdateProjectAgentRequest,
    setForm: React.Dispatch<React.SetStateAction<CreateProjectAgentRequest>> | React.Dispatch<React.SetStateAction<UpdateProjectAgentRequest>>
  ) => {
    const currentTools = form.tools || [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter((t) => t !== tool)
      : [...currentTools, tool];
    (setForm as (value: React.SetStateAction<CreateProjectAgentRequest | UpdateProjectAgentRequest>) => void)((prev) => ({ ...prev, tools: newTools }));
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

      // Build agent data
      const agentData: CreateProjectAgentRequest = {
        name: meta.name,
        description: typeof meta.description === 'string' ? meta.description : undefined,
        category: typeof meta.category === 'string' ? meta.category : 'custom',
        model: typeof meta.model === 'string' ? meta.model as AgentModel : 'sonnet',
        tools: Array.isArray(meta.tools) ? meta.tools as string[] : ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        system_prompt: content || undefined,
        enabled: typeof meta.enabled === 'boolean' ? meta.enabled : true,
      };

      // Create the agent
      const createdAgent = await projectConfigApi.createAgent(projectId, agentData);
      setAgents((prev) => [...prev, createdAgent]);
      showSuccess(`Agent "${createdAgent.name}" imported successfully`);

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

  // Group agents by category
  const agentsByCategory = AGENT_CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = agents.filter((a) => normalizeCategory(a.category, AGENT_CATEGORY_ORDER) === category);
      return acc;
    },
    {} as Record<EditorCategory, ProjectAgent[]>
  );

  // Calculate stats
  const enabledCount = agents.filter((a) => a.enabled).length;
  const totalCount = agents.length;

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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('editor.agents.title')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{enabledCount} / {totalCount} {t('editor.agents.enabled')}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Markdown
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('editor.agents.addAgent')}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-md">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-text-secondary mb-2">{t('editor.agents.noAgents')}</p>
            <p className="text-text-tertiary text-sm mb-4">{t('editor.agents.addFirstAgent')}</p>
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              {t('editor.agents.addAgent')}
            </Button>
          </div>
        ) : (
          AGENT_CATEGORY_ORDER.map((category) => {
            const categoryAgents = agentsByCategory[category];
            if (categoryAgents.length === 0) return null;

            const categoryConfig = CATEGORY_CONFIG[category];
            const isExpanded = expandedCategories.has(category);
            const enabledInCategory = categoryAgents.filter((a) => a.enabled).length;

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
                        {enabledInCategory} / {categoryAgents.length} enabled
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

                {/* Agent List */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {categoryAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm">
                              {agent.name}
                            </h4>
                            <span className="text-xs text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
                              {agent.model}
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {agent.description || 'No description'}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(agent)}
                            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                            title="Edit agent"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            disabled={deletingAgentId === agent.id}
                            className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Delete agent"
                          >
                            {deletingAgentId === agent.id ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>

                          {/* Toggle Switch */}
                          <ToggleSwitch
                            checked={agent.enabled}
                            onChange={() => handleToggleAgent(agent)}
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

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">{t('editor.agents.addAgent')}</h3>
              <p className="text-sm text-text-tertiary mt-1">
                {t('editor.agents.addFirstAgent')}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.agentName')} *
                </label>
                <input
                  type="text"
                  value={newAgentForm.name}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                  placeholder="my-custom-agent"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.description')}
                </label>
                <textarea
                  value={newAgentForm.description || ''}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, description: e.target.value })}
                  placeholder="A specialized agent for..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.category')}
                </label>
                <select
                  value={newAgentForm.category || 'development'}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AGENT_CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.model')}
                </label>
                <select
                  value={newAgentForm.model || 'sonnet'}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, model: e.target.value as AgentModel })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AGENT_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tools */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('editor.agents.tools')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_TOOL_OPTIONS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleToolToggle(tool, newAgentForm, setNewAgentForm)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        (newAgentForm.tools || []).includes(tool)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-bg-secondary text-text-secondary border-border hover:border-primary'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.systemPrompt')}
                </label>
                <textarea
                  value={newAgentForm.system_prompt || ''}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, system_prompt: e.target.value })}
                  placeholder="You are a specialized agent that..."
                  rows={6}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
                />
              </div>

              {/* Enabled */}
              <ToggleSwitch
                checked={newAgentForm.enabled ?? true}
                onChange={(checked) => setNewAgentForm({ ...newAgentForm, enabled: checked })}
                label="Enable agent after creation"
              />
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewAgentForm(getDefaultAgentForm());
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAgent}
                disabled={isCreating || !newAgentForm.name}
              >
                {isCreating ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {isEditModalOpen && editingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">{t('common.edit')}</h3>
              <p className="text-sm text-text-tertiary mt-1">
                {t('editor.agents.description')}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.agentName')} *
                </label>
                <input
                  type="text"
                  value={editAgentForm.name || ''}
                  onChange={(e) => setEditAgentForm({ ...editAgentForm, name: e.target.value })}
                  placeholder="my-custom-agent"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.description')}
                </label>
                <textarea
                  value={editAgentForm.description || ''}
                  onChange={(e) => setEditAgentForm({ ...editAgentForm, description: e.target.value })}
                  placeholder="A specialized agent for..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.category')}
                </label>
                <select
                  value={editAgentForm.category || 'development'}
                  onChange={(e) => setEditAgentForm({ ...editAgentForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AGENT_CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.model')}
                </label>
                <select
                  value={editAgentForm.model || 'sonnet'}
                  onChange={(e) => setEditAgentForm({ ...editAgentForm, model: e.target.value as AgentModel })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AGENT_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tools */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('editor.agents.tools')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_TOOL_OPTIONS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleToolToggle(tool, editAgentForm, setEditAgentForm)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        (editAgentForm.tools || []).includes(tool)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-bg-secondary text-text-secondary border-border hover:border-primary'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.agents.systemPrompt')}
                </label>
                <textarea
                  value={editAgentForm.system_prompt || ''}
                  onChange={(e) => setEditAgentForm({ ...editAgentForm, system_prompt: e.target.value })}
                  placeholder="You are a specialized agent that..."
                  rows={6}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
                />
              </div>

              {/* Enabled */}
              <ToggleSwitch
                checked={editAgentForm.enabled ?? true}
                onChange={(checked) => setEditAgentForm({ ...editAgentForm, enabled: checked })}
                label="Agent enabled"
              />
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAgent(null);
                  setEditAgentForm({});
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateAgent}
                disabled={isUpdating || !editAgentForm.name}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
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
                <h3 className="text-lg font-semibold text-text-primary">Import from Markdown</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Paste agent definition with YAML frontmatter
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
                  rows={14}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
                />
              </div>

              <div className="text-sm text-text-tertiary">
                <p className="font-medium text-text-secondary mb-2">Expected format:</p>
                <div className="bg-bg-secondary rounded-md p-3 font-mono text-xs overflow-x-auto">
                  <pre>{`---
name: my-custom-agent
description: A specialized agent for...
category: development
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
enabled: true
---

You are a specialized agent that...
(system_prompt content)`}</pre>
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
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportMarkdown}
                disabled={isImporting || !importMarkdownText.trim()}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
