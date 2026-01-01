/**
 * Skills Settings Editor Component
 * Allows managing skill configurations per project using database-backed API
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms';
import { projectConfigApi } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { ProjectSkill, CreateProjectSkillRequest, UpdateProjectSkillRequest } from '@/types';
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  parseMarkdownWithFrontmatter,
  ToggleSwitch,
  type EditorCategory,
} from './shared';

interface SkillsSettingsEditorProps {
  projectId: string;
}

interface SkillFormData {
  name: string;
  description: string;
  category: EditorCategory;
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

export const SkillsSettingsEditor: React.FC<SkillsSettingsEditorProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    try {
      const skillList = await projectConfigApi.listSkills(projectId);
      setSkills(skillList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load skills';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleOpenCreateModal = () => {
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (skill: ProjectSkill) => {
    setEditingSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      description: skill.description || '',
      category: (skill.category as EditorCategory) || 'custom',
      content: skill.content || '',
      enabled: skill.enabled,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) {
      toast.warning('Skill name is required');
      return;
    }

    try {
      setIsSaving(true);

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
        toast.success(`Skill "${skillForm.name}" updated successfully`);
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
        toast.success(`Skill "${skillForm.name}" created successfully`);
      }

      handleCloseModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save skill';
      toast.error(message);
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
      toast.success(`Skill "${deletingSkill.name}" deleted successfully`);
      setDeletingSkill(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete skill';
      toast.error(message);
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
      toast.success(`Skill "${skill.name}" ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update skill';
      toast.error(message);
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
      toast.success(`Skill "${createdSkill.name}" imported successfully`);

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
    {} as Record<EditorCategory, ProjectSkill[]>
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
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('editor.skills.title')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('editor.skills.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {enabledCount} / {totalCount} {t('editor.skills.enabled')}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)}>
                {t('editor.skills.importMarkdown')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                {t('editor.skills.createSkill')}
              </Button>
            </div>
          </div>
        </div>
      </div>

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
            <h3 className="text-lg font-medium text-text-secondary mb-2">{t('editor.skills.noSkills')}</h3>
            <p className="text-text-tertiary mb-4">
              {t('editor.skills.subtitle')}
            </p>
            <Button variant="primary" onClick={handleOpenCreateModal}>
              {t('editor.skills.createFirst')}
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
                          <ToggleSwitch
                            checked={skill.enabled}
                            onChange={() => handleToggleEnabled(skill)}
                            disabled={isSaving}
                            title={skill.enabled ? 'Disable skill' : 'Enable skill'}
                          />

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
            {skills.filter(s => !CATEGORY_ORDER.includes(s.category as EditorCategory)).length > 0 && (
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
                  {skills.filter(s => !CATEGORY_ORDER.includes(s.category as EditorCategory)).map((skill) => (
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
                        <ToggleSwitch
                          checked={skill.enabled}
                          onChange={() => handleToggleEnabled(skill)}
                          disabled={isSaving}
                        />
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
                {editingSkillId ? t('editor.skills.editSkill') : t('editor.skills.createNew')}
              </h3>
              <p className="text-sm text-text-tertiary mt-1">
                {editingSkillId ? 'Update skill configuration' : 'Define a new skill for Claude'}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Skill Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('editor.skills.skillName')} *
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
                  {t('editor.skills.description')}
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
                  {t('editor.skills.category')}
                </label>
                <select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value as EditorCategory })}
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
                  {t('editor.skills.content')}
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
              <ToggleSwitch
                checked={skillForm.enabled}
                onChange={(checked) => setSkillForm({ ...skillForm, enabled: checked })}
                label={t('editor.skills.enabled')}
              />
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSkill}
                disabled={isSaving || !skillForm.name.trim()}
              >
                {isSaving ? t('common.loading') : (editingSkillId ? t('common.save') : t('editor.skills.createSkill'))}
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
              <h3 className="text-lg font-semibold text-text-primary">{t('editor.skills.deleteSkill')}</h3>
            </div>

            <div className="p-4">
              <p className="text-text-secondary">
                {t('editor.skills.confirmDelete')}
              </p>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingSkill(null)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSkill}
                disabled={isSaving}
              >
                {isSaving ? t('common.loading') : t('common.delete')}
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
                <h3 className="text-lg font-semibold text-text-primary">{t('editor.skills.importMarkdown')}</h3>
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
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportMarkdown}
                disabled={isImporting || !importMarkdownText.trim()}
              >
                {isImporting ? t('common.loading') : t('editor.skills.importMarkdown')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
