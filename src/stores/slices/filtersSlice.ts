import { StateCreator } from 'zustand';
import { ViewFilter } from '../../lib/types';

export interface FiltersSlice {
  // State
  activeFilter: ViewFilter;
  activeCategory: string | null; // null means "all categories"

  // Actions
  setFilter: (filter: ViewFilter) => void;
  setCategoryFilter: (category: string | null) => void;
}

export const createFiltersSlice: StateCreator<FiltersSlice> = (set) => ({
  // Initial state
  activeFilter: 'today',
  activeCategory: null,

  // Set active filter
  setFilter: (filter: ViewFilter) => {
    set({ activeFilter: filter });
  },

  // Set category filter
  setCategoryFilter: (category: string | null) => {
    set({ activeCategory: category });
  },
});
