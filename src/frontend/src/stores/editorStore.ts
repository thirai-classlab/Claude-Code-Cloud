import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type EditorMode = 'vscode' | 'simple';

interface EditorState {
  editorMode: EditorMode;
  isFullscreen: boolean;
  theme: 'light' | 'dark';
  fontSize: number;

  setEditorMode: (mode: EditorMode) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (size: number) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      editorMode: 'vscode',
      isFullscreen: false,
      theme: 'dark',
      fontSize: 14,

      setEditorMode: (mode) => set({ editorMode: mode }),
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'editor-storage',
    }
  )
);
