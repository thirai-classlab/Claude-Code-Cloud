import { create } from 'zustand';
import { FileNode } from '@/types/file';
import { EditorFile } from '@/types/editor';

interface FileStore {
  // 状態
  fileTree: FileNode | null;
  openFiles: Map<string, EditorFile>;
  selectedFile: string | null;
  isDirty: Set<string>;
  expandedPaths: Set<string>;
  recentFiles: string[];

  // アクション
  setFileTree: (tree: FileNode) => void;
  setSelectedFile: (path: string) => void;
  openFile: (file: EditorFile) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
  togglePath: (path: string) => void;
  expandPath: (path: string) => void;
  collapsePath: (path: string) => void;
  addRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  // 初期状態
  fileTree: null,
  openFiles: new Map(),
  selectedFile: null,
  isDirty: new Set(),
  expandedPaths: new Set(['.', '/']),
  recentFiles: [],

  // ファイルツリー設定
  setFileTree: (tree) => set({ fileTree: tree }),

  // ファイル選択
  setSelectedFile: (path) => set({ selectedFile: path }),

  // ファイルを開く
  openFile: (file) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles);
      newOpenFiles.set(file.path, file);
      return { openFiles: newOpenFiles, selectedFile: file.path };
    }),

  // ファイルを閉じる
  closeFile: (path) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles);
      newOpenFiles.delete(path);
      const newDirty = new Set(state.isDirty);
      newDirty.delete(path);
      return {
        openFiles: newOpenFiles,
        isDirty: newDirty,
        selectedFile: state.selectedFile === path ? null : state.selectedFile,
      };
    }),

  // ファイル内容更新
  updateFileContent: (path, content) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles);
      const file = newOpenFiles.get(path);
      if (file) {
        newOpenFiles.set(path, { ...file, content, isDirty: true });
      }
      const newDirty = new Set(state.isDirty);
      newDirty.add(path);
      return { openFiles: newOpenFiles, isDirty: newDirty };
    }),

  // ダーティマーク
  markDirty: (path) =>
    set((state) => {
      const newDirty = new Set(state.isDirty);
      newDirty.add(path);
      return { isDirty: newDirty };
    }),

  // クリーンマーク
  markClean: (path) =>
    set((state) => {
      const newDirty = new Set(state.isDirty);
      newDirty.delete(path);
      const newOpenFiles = new Map(state.openFiles);
      const file = newOpenFiles.get(path);
      if (file) {
        newOpenFiles.set(path, { ...file, isDirty: false });
      }
      return { isDirty: newDirty, openFiles: newOpenFiles };
    }),

  // パス展開/折りたたみ
  togglePath: (path) =>
    set((state) => {
      const newExpandedPaths = new Set(state.expandedPaths);
      if (newExpandedPaths.has(path)) {
        newExpandedPaths.delete(path);
      } else {
        newExpandedPaths.add(path);
      }
      return { expandedPaths: newExpandedPaths };
    }),

  expandPath: (path) =>
    set((state) => {
      const newExpandedPaths = new Set(state.expandedPaths);
      newExpandedPaths.add(path);
      return { expandedPaths: newExpandedPaths };
    }),

  collapsePath: (path) =>
    set((state) => {
      const newExpandedPaths = new Set(state.expandedPaths);
      newExpandedPaths.delete(path);
      return { expandedPaths: newExpandedPaths };
    }),

  // 最近開いたファイル
  addRecentFile: (path) =>
    set((state) => {
      const newRecentFiles = [path, ...state.recentFiles.filter((p) => p !== path)].slice(0, 10);
      return { recentFiles: newRecentFiles };
    }),

  clearRecentFiles: () =>
    set({ recentFiles: [] }),
}));
