import { create } from 'zustand';
import { createTasksSlice, TasksSlice, AddTaskResult } from './slices/tasksSlice';
import { createFiltersSlice, FiltersSlice } from './slices/filtersSlice';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createNudgesSlice, NudgesSlice } from './slices/nudgesSlice';
import { createFocusSlice, FocusSlice } from './slices/focusSlice';
import {
  selectFilteredTasks,
  selectTodayTaskCount,
  selectCompletedTodayCount,
  selectUniqueCategories
} from './selectors/taskSelectors';
import { Task } from '../lib/types';

/**
 * Combined store interface - union of all slices.
 * This maintains the same API as before, just organized into slices internally.
 */
interface TaskStore extends TasksSlice, FiltersSlice, SettingsSlice, NudgesSlice, FocusSlice {
  // Computed selectors (kept for backward compatibility)
  filteredTasks: () => Task[];
  todayTaskCount: () => number;
  completedTodayCount: () => number;
  uniqueCategories: () => string[];
}

/**
 * Main store - composes all slices together.
 * Components continue to use `useTaskStore` as before.
 */
export const useTaskStore = create<TaskStore>((set, get, api) => ({
  // Compose all slices
  ...createTasksSlice(set, get, api),
  ...createFiltersSlice(set, get, api),
  ...createSettingsSlice(set, get, api),
  ...createNudgesSlice(set, get, api),
  ...createFocusSlice(set, get, api),

  // Computed selectors - these use the selector functions for better memoization
  filteredTasks: () => {
    const { tasks, activeFilter, activeCategory } = get();
    return selectFilteredTasks(tasks, activeFilter, activeCategory);
  },

  todayTaskCount: () => {
    const { tasks } = get();
    return selectTodayTaskCount(tasks);
  },

  completedTodayCount: () => {
    const { tasks } = get();
    return selectCompletedTodayCount(tasks);
  },

  uniqueCategories: () => {
    const { tasks } = get();
    return selectUniqueCategories(tasks);
  },
}));

// Export the AddTaskResult type for components that need it
export type { AddTaskResult };
