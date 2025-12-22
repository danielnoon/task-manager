import { StateCreator } from 'zustand';
import { FocusQueue } from '../../lib/types';
import { withIPC } from '../utils/ipcWrapper';

export interface FocusSlice {
  // State
  focusQueue: FocusQueue | null; // Cached daily plan

  // Actions
  planMyDay: () => Promise<void>;
  loadFocusQueue: () => Promise<void>;
  setFocusQueue: (queue: FocusQueue) => void;
}

export const createFocusSlice: StateCreator<FocusSlice> = (set) => ({
  // Initial state
  focusQueue: null,

  // Plan my day - generate new focus queue with AI
  planMyDay: async () => {
    await withIPC(
      async () => {
        const plan = await window.drift.tasks.planDay();
        set({
          focusQueue: {
            focusedTaskIds: plan.focusedTaskIds,
            reasoning: plan.reasoning,
            generatedAt: new Date()
          }
        });
      },
      set,
      'isAnalyzing'
    );
  },

  // Load existing focus queue from database
  loadFocusQueue: async () => {
    await withIPC(
      async () => {
        const queue = await window.drift.focusQueue.get();
        set({ focusQueue: queue });
      },
      set
    );
  },

  // Set focus queue (used for refresh events from main process)
  setFocusQueue: (queue: FocusQueue) => {
    set({ focusQueue: queue });
  },
});
