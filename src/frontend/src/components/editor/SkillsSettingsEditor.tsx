/**
 * Skills Settings Editor Component
 * Allows managing skill configurations per project
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { skillsApi } from '@/lib/api';
import type {
  SkillDefinition,
  SkillsConfig,
  SkillCategory,
  CreateCustomSkillRequest,
} from '@/types/skill';

interface SkillsSettingsEditorProps {
  projectId: string;
  onFileCreated?: (relativePath: string) => void;
}

// Category display configuration
const CATEGORY_CONFIG: Record<SkillCategory, { label: string; icon: React.ReactNode }> = {
  core: {
    label: 'Core',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
  },
  planning: {
    label: 'Planning & Design',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  session: {
    label: 'Session Management',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  specialized: {
    label: 'Specialized',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

const CATEGORY_ORDER: SkillCategory[] = [
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

export const SkillsSettingsEditor: React.FC<SkillsSettingsEditorProps> = ({ projectId, onFileCreated }) => {
  const [availableSkills, setAvailableSkills] = useState<SkillDefinition[]>([]);
  const [config, setConfig] = useState<SkillsConfig | null>(null);
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(
    new Set(CATEGORY_ORDER)
  );

  // Create skill modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSkillForm, setNewSkillForm] = useState<CreateCustomSkillRequest>({
    name: '',
    description: '',
    category: 'development',
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [skillsResponse, configResponse] = await Promise.all([
        skillsApi.getAvailable(),
        skillsApi.getConfig(projectId),
      ]);
      setAvailableSkills(skillsResponse);
      setConfig(configResponse.config);
      setConfigPath(configResponse.path);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load skill configuration';
      setError(message);
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

  const handleToggleSkill = async (skillName: string, enabled: boolean) => {
    if (!config) return;

    // Optimistic update
    const newConfig = { ...config };
    if (newConfig.skills[skillName]) {
      newConfig.skills[skillName] = { ...newConfig.skills[skillName], enabled };
    }
    setConfig(newConfig);

    try {
      setIsSaving(true);
      await skillsApi.toggleSkill(projectId, skillName, enabled);
      showSuccess(`${skillName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      // Revert on error
      loadData();
      const message = err instanceof Error ? err.message : 'Failed to toggle skill';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: SkillsConfig = {
        ...config,
        skills: Object.fromEntries(
          Object.entries(config.skills).map(([name, skill]) => [
            name,
            { ...skill, enabled: true },
          ])
        ),
      };
      await skillsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All skills enabled');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable all skills';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableAll = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const newConfig: SkillsConfig = {
        ...config,
        skills: Object.fromEntries(
          Object.entries(config.skills).map(([name, skill]) => [
            name,
            { ...skill, enabled: false },
          ])
        ),
      };
      await skillsApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess('All skills disabled');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable all skills';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all skill settings to defaults?')) return;

    try {
      setIsSaving(true);
      const response = await skillsApi.resetConfig(projectId);
      setConfig(response.config);
      showSuccess('Settings reset to defaults');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: SkillCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateSkill = async () => {
    if (!newSkillForm.name || !newSkillForm.description) {
      setError('Name and description are required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await skillsApi.createCustomSkill(projectId, newSkillForm);
      showSuccess(response.message);
      setIsCreateModalOpen(false);
      setNewSkillForm({
        name: '',
        description: '',
        category: 'development',
      });
      // Notify parent to open the file in VSCode
      if (onFileCreated) {
        onFileCreated(response.relative_path);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create custom skill';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Group skills by category
  const skillsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = availableSkills.filter((s) => s.category === category);
      return acc;
    },
    {} as Record<SkillCategory, SkillDefinition[]>
  );

  // Calculate stats
  const enabledCount = config
    ? Object.values(config.skills).filter((s) => s.enabled).length
    : 0;
  const totalCount = availableSkills.length;

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
            <h2 className="text-lg font-semibold text-text-primary">Skills Settings</h2>
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
            Create New Skill
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
          const skills = skillsByCategory[category];
          if (skills.length === 0) return null;

          const categoryConfig = CATEGORY_CONFIG[category];
          const isExpanded = expandedCategories.has(category);
          const enabledInCategory = skills.filter(
            (s) => config?.skills[s.name]?.enabled
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
                      {enabledInCategory} / {skills.length} enabled
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

              {/* Skill List */}
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {skills.map((skill) => {
                    // No global defaults - if not in config, it's disabled
                    const isEnabled = config?.skills[skill.name]?.enabled ?? false;

                    return (
                      <div
                        key={skill.name}
                        className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm font-mono">
                              /{skill.name}
                            </h4>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {skill.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleSkill(skill.name, !isEnabled)}
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

      {/* Create Skill Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Create New Skill</h3>
              <p className="text-sm text-text-tertiary mt-1">
                Create a custom skill definition file
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Skill Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={newSkillForm.name}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, name: e.target.value })}
                  placeholder="sc:my-skill"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description *
                </label>
                <textarea
                  value={newSkillForm.description}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, description: e.target.value })}
                  placeholder="A custom skill that..."
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
                  value={newSkillForm.category}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, category: e.target.value as SkillCategory })}
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
                onClick={handleCreateSkill}
                disabled={isCreating || !newSkillForm.name || !newSkillForm.description}
              >
                {isCreating ? 'Creating...' : 'Create Skill'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
