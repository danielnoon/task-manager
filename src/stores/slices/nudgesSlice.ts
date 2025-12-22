import { StateCreator } from 'zustand';
import { Nudge } from '../../lib/types';
import { withIPC } from '../utils/ipcWrapper';

export interface NudgesSlice {
  // State
  activeNudge: Nudge | null;

  // Actions
  loadActiveNudge: () => Promise<void>;
  dismissNudge: () => Promise<void>;
}

export const createNudgesSlice: StateCreator<NudgesSlice> = (set, get) => ({
  // Initial state
  activeNudge: null,

  // Load active nudge
  loadActiveNudge: async () => {
    await withIPC(
      async () => {
        const nudge = await window.drift.nudges.getActive();
        set({ activeNudge: nudge });
      },
      set
    );
  },

  // Dismiss nudge
  dismissNudge: async () => {
    const { activeNudge } = get();
    if (!activeNudge) return;

    await withIPC(
      async () => {
        await window.drift.nudges.dismiss(activeNudge.id);
        set({ activeNudge: null });
      },
      set
    );
  },
});
