'use client';

import { useState, useEffect, useCallback } from 'react';
import { filesAPI, FileContentResponse } from '@/lib/api/files';
import { FileNode } from '@/types/file';

export interface UseFilesOptions {
  projectId: string;
  autoLoad?: boolean;
}

export interface UseFilesReturn {
  files: FileNode | null;
  loading: boolean;
  error: string | null;
  loadFiles: (path?: string) => Promise<void>;
  readFile: (path: string) => Promise<FileContentResponse>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
}

export function useFiles({ projectId, autoLoad = true }: UseFilesOptions): UseFilesReturn {
  const [files, setFiles] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(
    async (path: string = '.') => {
      if (!projectId) {
        setError('Project ID is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await filesAPI.listFiles(projectId, path);
        const fileTree = filesAPI.buildFileTree(response.files);
        setFiles(fileTree);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
        setError(errorMessage);
        console.error('Failed to load files:', err);
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const readFile = useCallback(
    async (path: string): Promise<FileContentResponse> => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await filesAPI.readFile(projectId, path);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const writeFile = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      setLoading(true);
      setError(null);

      try {
        await filesAPI.writeFile(projectId, path, content);
        await loadFiles();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [projectId, loadFiles]
  );

  const deleteFile = useCallback(
    async (path: string): Promise<void> => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      setLoading(true);
      setError(null);

      try {
        await filesAPI.deleteFile(projectId, path);
        await loadFiles();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [projectId, loadFiles]
  );

  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (autoLoad && projectId) {
      loadFiles();
    }
  }, [autoLoad, projectId, loadFiles]);

  return {
    files,
    loading,
    error,
    loadFiles,
    readFile,
    writeFile,
    deleteFile,
    refreshFiles,
  };
}
