export type EditorMode = 'vscode' | 'simple';

export interface EditorState {
  mode: EditorMode;
  isFullscreen: boolean;
  theme: 'light' | 'dark';
  fontSize: number;
}

export interface EditorFile {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  isExpanded?: boolean;
}
