import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'claude' | 'linear';

interface UIState {
  theme: Theme;
  isSidebarOpen: boolean;
  isFileTreeOpen: boolean;
  chatWidth: number;
  fontSize: number;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleFileTree: () => void;
  setChatWidth: (width: number) => void;
  setFontSize: (size: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'linear',
      isSidebarOpen: true,
      isFileTreeOpen: true,
      chatWidth: 600,
      fontSize: 14,

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      toggleFileTree: () =>
        set((state) => ({ isFileTreeOpen: !state.isFileTreeOpen })),

      setChatWidth: (width) =>
        set({ chatWidth: Math.max(400, Math.min(800, width)) }),

      setFontSize: (size) =>
        set({ fontSize: Math.max(10, Math.min(24, size)) }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
