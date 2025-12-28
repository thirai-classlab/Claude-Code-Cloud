/**
 * Command Settings Editor Component
 * Allows managing slash command configurations per project
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { commandsApi } from '@/lib/api';
import type {
  CommandDefinition,
  CommandsConfig,
  CommandCategory,
  CreateCustomCommandRequest,
} from '@/types/command';

interface CommandSettingsEditorProps {
  projectId: string;
  onFileCreated?: (relativePath: string) => void;
}

// Category display configuration
const CATEGORY_CONFIG: Record<CommandCategory, { label: string; icon: React.ReactNode }> = {
  core: {
    label: 'Core',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  planning: {
    label: 'Planning & Design',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
  analysis: {
    label: 'Analysis & Research',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
  git: {
    label: 'Git & Version Control',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  session: {
    label: 'Session Management',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
  },
  specialized: {
    label: 'Specialized',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  help: {
    label: 'Help',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const CATEGORY_ORDER: CommandCategory[] = [
  'core',
  'planning',
  'development',
  'analysis',
  'documentation',
  'git',
  'session',
  'specialized',
  'help',
];

export const CommandSettingsEditor: React.FC<CommandSettingsEditorProps> = ({ projectId, onFileCreated }) => {
  const [availableCommands, setAvailableCommands] = useState<CommandDefinition[]>([]);
  const [config, setConfig] = useState<CommandsConfig | null>(null);
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<CommandCategory>>(
    new Set(CATEGORY_ORDER)
  );

  // Create command modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCommandForm, setNewCommandForm] = useState<CreateCustomCommandRequest>({
    name: '',
    description: '',
    category: 'development',
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [commandsResponse, configResponse] = await Promise.all([
        commandsApi.getAvailableCommands(),
        commandsApi.getConfig(projectId),
      ]);
      setAvailableCommands(commandsResponse);
      setConfig(configResponse.config);
      setConfigPath(configResponse.path);
    } catch (err: any) {
      setError(err.message || 'Failed to load command configuration');
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

  const handleToggleCommand = async (commandName: string, enabled: boolean) => {
    if (!config) return;

    // Optimistic update
    const newConfig = { ...config };
    if (newConfig.commands[commandName]) {
      newConfig.commands[commandName] = { ...newConfig.commands[commandName], enabled };
    }
    setConfig(newConfig);

    try {
      setIsSaving(true);
      await commandsApi.toggleCommand(projectId, commandName, enabled);
      showSuccess(`${commandName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      // Revert on error
      loadData();
      setError(err.message || 'Failed to toggle command');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: CommandsConfig = {
        ...config,
        commands: Object.fromEntries(
          Object.entries(config.commands).map(([name, cmd]) => [
            name,
            { ...cmd, enabled: true },
          ])
        ),
      };
      await commandsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All commands enabled');
    } catch (err: any) {
      setError(err.message || 'Failed to enable all commands');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: CommandsConfig = {
        ...config,
        commands: Object.fromEntries(
          Object.entries(config.commands).map(([name, cmd]) => [
            name,
            { ...cmd, enabled: false },
          ])
        ),
      };
      await commandsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All commands disabled');
    } catch (err: any) {
      setError(err.message || 'Failed to disable all commands');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all command settings to defaults?')) return;

    try {
      setIsSaving(true);
      const response = await commandsApi.resetConfig(projectId);
      setConfig(response.config);
      showSuccess('Settings reset to defaults');
    } catch (err: any) {
      setError(err.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: CommandCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCommand = async () => {
    if (!newCommandForm.name || !newCommandForm.description) {
      setError('Name and description are required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await commandsApi.createCustomCommand(projectId, newCommandForm);
      showSuccess(response.message);
      setIsCreateModalOpen(false);
      setNewCommandForm({
        name: '',
        description: '',
        category: 'development',
      });
      // Notify parent to open the file in VSCode
      if (onFileCreated) {
        onFileCreated(response.relative_path);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create custom command');
    } finally {
      setIsCreating(false);
    }
  };

  // Group commands by category
  const commandsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = availableCommands.filter((c) => c.category === category);
      return acc;
    },
    {} as Record<CommandCategory, CommandDefinition[]>
  );

  // Calculate stats
  const enabledCount = config
    ? Object.values(config.commands).filter((c) => c.enabled).length
    : 0;
  const totalCount = availableCommands.length;

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
            <h2 className="text-lg font-semibold text-text-primary">Command Settings</h2>
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
            Create New Command
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
          const commands = commandsByCategory[category];
          if (commands.length === 0) return null;

          const categoryConfig = CATEGORY_CONFIG[category];
          const isExpanded = expandedCategories.has(category);
          const enabledInCategory = commands.filter(
            (c) => config?.commands[c.name]?.enabled
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
                      {enabledInCategory} / {commands.length} enabled
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
                  {commands.map((command) => {
                    // No global defaults - if not in config, it's disabled
                    const isEnabled = config?.commands[command.name]?.enabled ?? false;

                    return (
                      <div
                        key={command.name}
                        className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm font-mono">
                              {command.name}
                            </h4>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {command.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleCommand(command.name, !isEnabled)}
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

      {/* Create Command Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Create New Command</h3>
              <p className="text-sm text-text-tertiary mt-1">
                Create a custom command definition file
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Command Name *
                </label>
                <input
                  type="text"
                  value={newCommandForm.name}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, name: e.target.value })}
                  placeholder="sc:my-command"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description *
                </label>
                <textarea
                  value={newCommandForm.description}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, description: e.target.value })}
                  placeholder="A custom command that..."
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
                  value={newCommandForm.category}
                  onChange={(e) => setNewCommandForm({ ...newCommandForm, category: e.target.value as CommandCategory })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
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
                onClick={handleCreateCommand}
                disabled={isCreating || !newCommandForm.name || !newCommandForm.description}
              >
                {isCreating ? 'Creating...' : 'Create Command'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
