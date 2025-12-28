/**
 * Agent Settings Editor Component
 * Allows managing sub-agent configurations per project
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { agentsApi } from '@/lib/api';
import type {
  AgentDefinition,
  AgentsConfig,
  AgentCategory,
  AgentModel,
  CreateCustomAgentRequest,
} from '@/types/agent';
import { AGENT_MODEL_OPTIONS, AGENT_TOOL_OPTIONS } from '@/types/agent';

interface AgentSettingsEditorProps {
  projectId: string;
  onFileCreated?: (relativePath: string) => void;
}

// Category display configuration
const CATEGORY_CONFIG: Record<AgentCategory, { label: string; icon: React.ReactNode }> = {
  exploration: {
    label: 'Exploration & Planning',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  development: {
    label: 'Development',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  quality: {
    label: 'Quality & Testing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  documentation: {
    label: 'Documentation',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  devops: {
    label: 'DevOps & Infrastructure',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
  },
  data: {
    label: 'Data & AI',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
};

const CATEGORY_ORDER: AgentCategory[] = ['exploration', 'development', 'quality', 'documentation', 'devops', 'data'];

export const AgentSettingsEditor: React.FC<AgentSettingsEditorProps> = ({ projectId, onFileCreated }) => {
  const [availableAgents, setAvailableAgents] = useState<AgentDefinition[]>([]);
  const [config, setConfig] = useState<AgentsConfig | null>(null);
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<AgentCategory>>(
    new Set(CATEGORY_ORDER)
  );

  // Create agent modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState<CreateCustomAgentRequest>({
    name: '',
    description: '',
    category: 'development',
    model: 'sonnet',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsResponse, configResponse] = await Promise.all([
        agentsApi.getAvailableAgents(),
        agentsApi.getConfig(projectId),
      ]);
      setAvailableAgents(agentsResponse);
      setConfig(configResponse.config);
      setConfigPath(configResponse.path);
    } catch (err: any) {
      setError(err.message || 'Failed to load agent configuration');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleToggleAgent = async (agentName: string, enabled: boolean) => {
    if (!config) return;

    // Optimistic update
    const newConfig = { ...config };
    if (newConfig.agents[agentName]) {
      newConfig.agents[agentName] = { ...newConfig.agents[agentName], enabled };
    }
    setConfig(newConfig);

    try {
      setIsSaving(true);
      await agentsApi.toggleAgent(projectId, agentName, enabled);
      showSuccess(`${agentName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      // Revert on error
      loadData();
      setError(err.message || 'Failed to toggle agent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: AgentsConfig = {
        ...config,
        agents: Object.fromEntries(
          Object.entries(config.agents).map(([name, agent]) => [
            name,
            { ...agent, enabled: true },
          ])
        ),
      };
      await agentsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All agents enabled');
    } catch (err: any) {
      setError(err.message || 'Failed to enable all agents');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: AgentsConfig = {
        ...config,
        agents: Object.fromEntries(
          Object.entries(config.agents).map(([name, agent]) => [
            name,
            { ...agent, enabled: false },
          ])
        ),
      };
      await agentsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All agents disabled');
    } catch (err: any) {
      setError(err.message || 'Failed to disable all agents');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all agent settings to defaults?')) return;

    try {
      setIsSaving(true);
      const response = await agentsApi.resetConfig(projectId);
      setConfig(response.config);
      showSuccess('Settings reset to defaults');
    } catch (err: any) {
      setError(err.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: AgentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateAgent = async () => {
    if (!newAgentForm.name || !newAgentForm.description) {
      setError('Name and description are required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await agentsApi.createCustomAgent(projectId, newAgentForm);
      showSuccess(response.message);
      setIsCreateModalOpen(false);
      setNewAgentForm({
        name: '',
        description: '',
        category: 'development',
        model: 'sonnet',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
      });
      // Notify parent to open the file in VSCode
      if (onFileCreated) {
        onFileCreated(response.relative_path);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create custom agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToolToggle = (tool: string) => {
    setNewAgentForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  };

  // Group agents by category
  const agentsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = availableAgents.filter((a) => a.category === category);
      return acc;
    },
    {} as Record<AgentCategory, AgentDefinition[]>
  );

  // Calculate stats
  const enabledCount = config
    ? Object.values(config.agents).filter((a) => a.enabled).length
    : 0;
  const totalCount = availableAgents.length;

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
            <h2 className="text-lg font-semibold text-text-primary">Agent Settings</h2>
            <p className="text-xs text-text-tertiary mt-1 font-mono">{configPath}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {enabledCount} / {totalCount} enabled
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Agent
          </Button>
          <Button variant="secondary" size="sm" onClick={handleEnableAll} disabled={isSaving}>
            Enable All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDisableAll} disabled={isSaving}>
            Disable All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleResetDefaults} disabled={isSaving}>
            Reset to Defaults
          </Button>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {CATEGORY_ORDER.map((category) => {
          const agents = agentsByCategory[category];
          if (agents.length === 0) return null;

          const categoryConfig = CATEGORY_CONFIG[category];
          const isExpanded = expandedCategories.has(category);
          const enabledInCategory = agents.filter(
            (a) => config?.agents[a.name]?.enabled
          ).length;

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
                      {enabledInCategory} / {agents.length} enabled
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
                  {agents.map((agent) => {
                    // No global defaults - if not in config, it's disabled
                    const isEnabled = config?.agents[agent.name]?.enabled ?? false;

                    return (
                      <div
                        key={agent.name}
                        className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm">
                              {agent.name}
                            </h4>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {agent.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleAgent(agent.name, !isEnabled)}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isEnabled ? 'bg-primary' : 'bg-gray-200'
                          }`}
                          role="switch"
                          aria-checked={isEnabled}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Create New Agent</h3>
              <p className="text-sm text-text-tertiary mt-1">
                Create a custom agent definition file
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Agent Name *
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
                  Description *
                </label>
                <textarea
                  value={newAgentForm.description}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, description: e.target.value })}
                  placeholder="A specialized agent for..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={newAgentForm.category}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, category: e.target.value as AgentCategory })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Model
                </label>
                <select
                  value={newAgentForm.model}
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
                  Available Tools
                </label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_TOOL_OPTIONS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleToolToggle(tool)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        newAgentForm.tools.includes(tool)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-bg-secondary text-text-secondary border-border hover:border-primary'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAgent}
                disabled={isCreating || !newAgentForm.name || !newAgentForm.description}
              >
                {isCreating ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
