/**
 * Confirm Dialog Store
 * Global state management for confirmation dialogs
 */

import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmActions {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

type ConfirmStore = ConfirmState & ConfirmActions;

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,

  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(true);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },

  handleCancel: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(false);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },
}));

// Helper function for easy usage
export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  return useConfirmStore.getState().confirm(options);
};
