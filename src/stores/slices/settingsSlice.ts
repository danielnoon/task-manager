import { StateCreator } from 'zustand';
import { Settings } from '../../lib/types';
import { withIPC } from '../utils/ipcWrapper';

export interface SettingsSlice {
  // State
  settings: Settings | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  // Initial state
  settings: null,

  // Load settings
  loadSettings: async () => {
    await withIPC(
      async () => {
        const settings = await window.drift.settings.get();
        set({ settings });
      },
      set
    );
  },

  // Update settings
  updateSettings: async (updates: Partial<Settings>) => {
    await withIPC(
      async () => {
        const settings = await window.drift.settings.update(updates);
        set({ settings });
      },
      set
    );
  },
});
