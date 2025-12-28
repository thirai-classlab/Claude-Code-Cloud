import { apiClient } from './client';
import { FileNode } from '@/types/file';

export interface FileListResponse {
  files: {
    path: string;
    name: string;
    size: number;
    is_directory: boolean;
    modified_at: string;
  }[];
  total: number;
}

export interface FileContentResponse {
  path: string;
  content: string;
  size: number;
  mime_type: string;
}

export class FilesAPI {
  async listFiles(projectId: string, path: string = '.'): Promise<FileListResponse> {
    const params = new URLSearchParams({
      project_id: projectId,
      path: path,
    });
    const response = await apiClient.get<FileListResponse>(`/api/files?${params}`);
    return response;
  }

  async readFile(projectId: string, path: string): Promise<FileContentResponse> {
    const params = new URLSearchParams({
      project_id: projectId,
      path: path,
    });
    const response = await apiClient.get<FileContentResponse>(`/api/files/content?${params}`);
    return response;
  }

  async writeFile(projectId: string, path: string, content: string): Promise<void> {
    const params = new URLSearchParams({
      project_id: projectId,
      path: path,
      content: content,
    });
    await apiClient.post(`/api/files/content?${params}`);
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    const params = new URLSearchParams({
      project_id: projectId,
      path: path,
    });
    await apiClient.delete(`/api/files/content?${params}`);
  }

  buildFileTree(files: FileListResponse['files']): FileNode | null {
    if (files.length === 0) return null;

    const root: FileNode = {
      name: '/',
      path: '.',
      type: 'directory',
      children: [],
    };

    files.forEach((file) => {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');

        if (!current.children) {
          current.children = [];
        }

        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path,
            type: isLast && !file.is_directory ? 'file' : 'directory',
            children: isLast && !file.is_directory ? undefined : [],
            size: isLast ? file.size : undefined,
            modified: isLast ? file.modified_at : undefined,
          };
          current.children.push(child);
        }
        current = child;
      });
    });

    return root;
  }
}

export const filesAPI = new FilesAPI();
