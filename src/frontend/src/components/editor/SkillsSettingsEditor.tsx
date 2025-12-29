/**
 * Skills Settings Editor Component
 * Allows managing skill configurations per project using database-backed API
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { projectConfigApi } from '@/lib/api';
import type { ProjectSkill, CreateProjectSkillRequest, UpdateProjectSkillRequest } from '@/types';

interface SkillsSettingsEditorProps {
  projectId: string;
}

// Skill category type
type SkillCategory = 'custom' | 'exploration' | 'development' | 'quality' | 'documentation' | 'devops' | 'data';

// Category display configuration
const CATEGORY_CONFIG: Record<SkillCategory, { label: string; icon: React.ReactNode }> = {
  custom: {
    label: 'Custom',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  exploration: {
    label: 'Exploration',
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
    label: 'Quality',
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
    label: 'DevOps',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  data: {
    label: 'Data',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
};

const CATEGORY_ORDER: SkillCategory[] = [
  'custom',
  'exploration',
  'development',
  'quality',
  'documentation',
  'devops',
  'data',
];

interface SkillFormData {
  name: string;
  description: string;
  category: SkillCategory;
  content: string;
  enabled: boolean;
}

const emptySkillForm: SkillFormData = {
  name: '',
  description: '',
  category: 'custom',
  content: '',
  enabled: true,
};

// Parse YAML frontmatter from markdown
interface ParsedMarkdown {
  meta: Record<string, unknown>;
  content: string;
}

const parseMarkdownWithFrontmatter = (markdown: string): ParsedMarkdown | null => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  if (!match) return null;

  const frontmatter = match[1];
  const content = match[2].trim();

  // Simple YAML parser
  const meta: Record<string, unknown> = {};
  const lines = frontmatter.split('\n');

  for (const line of lines) {
    // Key: value
    if (line.match(/^(\w+):\s*(.+)$/)) {
      const matches = line.match(/^(\w+):\s*(.+)$/);
      if (matches) {
        const [, key, value] = matches;
        meta[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
    }
  }

  return { meta, content };
};

export const SkillsSettingsEditor: React.FC<SkillsSettingsEditorProps> = ({ projectId }) => {
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState<SkillFormData>(emptySkillForm);

  // Delete confirmation state
  const [deletingSkill, setDeletingSkill] = useState<ProjectSkill | null>(null);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMarkdownText, setImportMarkdownText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const skillList = await projectConfigApi.listSkills(projectId);
      setSkills(skillList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load skills';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleOpenCreateModal = () => {
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
    setIsModalOpen(true);
    setError(null);
  };

  const handleOpenEditModal = (skill: ProjectSkill) => {
    setEditingSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      description: skill.description || '',
      category: (skill.category as SkillCategory) || 'custom',
      content: skill.content || '',
      enabled: skill.enabled,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
    setError(null);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) {
      setError('Skill name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (editingSkillId) {
        // Update existing skill
        const updateData: UpdateProjectSkillRequest = {
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || undefined,
          category: skillForm.category,
          content: skillForm.content.trim() || undefined,
          enabled: skillForm.enabled,
        };
        const updated = await projectConfigApi.updateSkill(projectId, editingSkillId, updateData);
        setSkills(prev => prev.map(s => s.id === editingSkillId ? updated : s));
        showSuccess(`Skill "${skillForm.name}" updated successfully`);
      } else {
        // Create new skill
        const createData: CreateProjectSkillRequest = {
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || undefined,
          category: skillForm.category,
          content: skillForm.content.trim() || undefined,
          enabled: skillForm.enabled,
        };
        const created = await projectConfigApi.createSkill(projectId, createData);
        setSkills(prev => [...prev, created]);
        showSuccess(`Skill "${skillForm.name}" created successfully`);
      }

      handleCloseModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save skill';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async () => {
    if (!deletingSkill) return;

    try {
      setIsSaving(true);
      await projectConfigApi.deleteSkill(projectId, deletingSkill.id);
      setSkills(prev => prev.filter(s => s.id !== deletingSkill.id));
      showSuccess(`Skill "${deletingSkill.name}" deleted successfully`);
      setDeletingSkill(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete skill';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (skill: ProjectSkill) => {
    try {
      setIsSaving(true);
      const updated = await projectConfigApi.updateSkill(projectId, skill.id, {
        enabled: !skill.enabled,
      });
      setSkills(prev => prev.map(s => s.id === skill.id ? updated : s));
      showSuccess(`Skill "${skill.name}" ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update skill';
      setError(message);
    } finally {
      setIsSaving(false);
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

      // Build skill data
      const skillData: CreateProjectSkillRequest = {
        name: meta.name,
        description: typeof meta.description === 'string' ? meta.description : undefined,
        category: typeof meta.category === 'string' ? meta.category : 'custom',
        content: content || undefined,
        enabled: typeof meta.enabled === 'boolean' ? meta.enabled : true,
      };

      // Create the skill
      const createdSkill = await projectConfigApi.createSkill(projectId, skillData);
      setSkills((prev) => [...prev, createdSkill]);
      showSuccess(`Skill "${createdSkill.name}" imported successfully`);

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

  // Group skills by category
  const skillsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = skills.filter((s) => s.category === category);
      return acc;
    },
    {} as Record<SkillCategory, ProjectSkill[]>
  );

  // Calculate stats
  const enabledCount = skills.filter((s) => s.enabled).length;
  const totalCount = skills.length;

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
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Skills Settings</h2>
          <p className="text-xs text-text-tertiary mt-1">
            {enabledCount} / {totalCount} enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Markdown
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Skill
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && !isModalOpen && (
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
        {skills.length === 0 ? (
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-lg font-medium text-text-secondary mb-2">No Skills Configured</h3>
            <p className="text-text-tertiary mb-4">
              Create skills to define specialized prompts and behaviors for Claude.
            </p>
            <Button variant="primary" onClick={handleOpenCreateModal}>
              Create Your First Skill
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {CATEGORY_ORDER.map((category) => {
              const categorySkills = skillsByCategory[category];
              if (categorySkills.length === 0) return null;

              const categoryConfig = CATEGORY_CONFIG[category];
              const enabledInCategory = categorySkills.filter((s) => s.enabled).length;

              return (
                <div
                  key={category}
                  className="rounded-lg border border-border bg-bg-secondary overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-bg-tertiary/30">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      {categoryConfig.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{categoryConfig.label}</h3>
                      <p className="text-xs text-text-tertiary">
                        {enabledInCategory} / {categorySkills.length} enabled
                      </p>
                    </div>
                  </div>

                  {/* Skill List */}
                  <div className="divide-y divide-border">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`px-4 py-3 flex items-center justify-between transition-colors ${
                          skill.enabled ? 'hover:bg-bg-tertiary/50' : 'opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary text-sm font-mono">
                              {skill.name}
                            </h4>
                            {!skill.enabled && (
                              <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                              {skill.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Switch */}
                          <button
                            onClick={() => handleToggleEnabled(skill)}
                            disabled={isSaving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                              skill.enabled ? 'bg-primary' : 'bg-bg-tertiary'
                            }`}
                            role="switch"
                            aria-checked={skill.enabled}
                            title={skill.enabled ? 'Disable skill' : 'Enable skill'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                skill.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(skill)}
                            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setDeletingSkill(skill)}
                            disabled={isSaving}
                            className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Skills without category or with unknown category */}
            {skills.filter(s => !CATEGORY_ORDER.includes(s.category as SkillCategory)).length > 0 && (
              <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-bg-tertiary/30">
                  <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-text-tertiary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">Other</h3>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {skills.filter(s => !CATEGORY_ORDER.includes(s.category as SkillCategory)).map((skill) => (
                    <div
                      key={skill.id}
                      className={`px-4 py-3 flex items-center justify-between transition-colors ${
                        skill.enabled ? 'hover:bg-bg-tertiary/50' : 'opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-text-primary text-sm font-mono">
                            {skill.name}
                          </h4>
                          {!skill.enabled && (
                            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {skill.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(skill)}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                            skill.enabled ? 'bg-primary' : 'bg-bg-tertiary'
                          }`}
                          role="switch"
                          aria-checked={skill.enabled}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              skill.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(skill)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingSkill(skill)}
                          disabled={isSaving}
                          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Skill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingSkillId ? 'Edit Skill' : 'Create New Skill'}
              </h3>
              <p className="text-sm text-text-tertiary mt-1">
                {editingSkillId ? 'Update skill configuration' : 'Define a new skill for Claude'}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Skill Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  placeholder="my-skill"
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={skillForm.description}
                  onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                  placeholder="A skill that..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value as SkillCategory })}
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
                  Skill Content (Prompt)
                </label>
                <textarea
                  value={skillForm.content}
                  onChange={(e) => setSkillForm({ ...skillForm, content: e.target.value })}
                  placeholder="Enter the skill prompt content here..."
                  rows={10}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  This content will be used as part of the system prompt when the skill is enabled.
                </p>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSkillForm({ ...skillForm, enabled: !skillForm.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary ${
                    skillForm.enabled ? 'bg-primary' : 'bg-bg-tertiary'
                  }`}
                  role="switch"
                  aria-checked={skillForm.enabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      skillForm.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm text-text-secondary">
                  {skillForm.enabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSkill}
                disabled={isSaving || !skillForm.name.trim()}
              >
                {isSaving ? 'Saving...' : (editingSkillId ? 'Update Skill' : 'Create Skill')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-md mx-4 border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Delete Skill</h3>
            </div>

            <div className="p-4">
              <p className="text-text-secondary">
                Are you sure you want to delete the skill &quot;{deletingSkill.name}&quot;? This action cannot be undone.
              </p>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingSkill(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSkill}
                disabled={isSaving}
              >
                {isSaving ? 'Deleting...' : 'Delete'}
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
                  Paste skill definition with YAML frontmatter
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
name: my-skill
description: Description of the skill
category: development
enabled: true
---

Skill prompt content here...`}</pre>
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
