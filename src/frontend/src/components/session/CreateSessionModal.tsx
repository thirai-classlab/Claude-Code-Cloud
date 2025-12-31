/**
 * CreateSessionModal Component
 * Modal dialog for creating a new session
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/atoms';
import { modelsApi, ModelInfo } from '@/lib/api';

// Fallback models when API is unavailable
const FALLBACK_MODELS = [
  { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4', type: 'model' },
  { id: 'claude-opus-4-20250514', display_name: 'Claude Opus 4', type: 'model' },
  { id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', type: 'model' },
];

export interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name?: string; model?: string }) => Promise<void>;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [model, setModel] = useState(FALLBACK_MODELS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available models from API
  const loadModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const response = await modelsApi.listRecommended();
      if (response.models.length > 0) {
        setModels(response.models);
        // Set default to first model if current selection is not in the new list
        if (!response.models.find(m => m.id === model)) {
          setModel(response.models[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
      // Keep using fallback models
    } finally {
      setIsLoadingModels(false);
    }
  }, [model]);

  // Load models when modal opens
  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen, loadModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: title.trim() || undefined,
        model: model,
      });
      // Reset form
      setTitle('');
      setModel(models[0]?.id || FALLBACK_MODELS[0].id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setModel(models[0]?.id || FALLBACK_MODELS[0].id);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Session" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Session Title */}
        <div>
          <label
            htmlFor="session-title"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Session Title (Optional)
          </label>
          <input
            id="session-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Session"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            autoFocus
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            Leave blank to auto-generate a title
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label
            htmlFor="session-model"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Claude Model
            {isLoadingModels && (
              <span className="ml-2 text-xs text-text-tertiary">(loading...)</span>
            )}
          </label>
          <select
            id="session-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            disabled={isSubmitting || isLoadingModels}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-tertiary">
            You can change the model during the session
          </p>
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
            Create Session
          </Button>
        </div>
      </form>
    </Modal>
  );
};
