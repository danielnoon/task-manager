import { Task, ViewFilter } from '../../lib/types';

/**
 * Memoized selectors for computed task data.
 * These functions are pure and can be used with Zustand's built-in selector pattern.
 */

/**
 * Get filtered tasks based on active filter and category.
 * This logic is extracted from the original filteredTasks computed property.
 */
export function selectFilteredTasks(
  tasks: Task[],
  activeFilter: ViewFilter,
  activeCategory: string | null
): Task[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  let filtered: Task[];

  switch (activeFilter) {
    case 'today':
      // First, get tasks due today or without due dates
      filtered = tasks.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return true; // Tasks without due dates show in Today
        const due = new Date(t.dueDate);
        return due < tomorrow;
      });

      // Smart Today: if empty, show upcoming tasks instead
      if (filtered.length === 0) {
        filtered = tasks.filter((t) => {
          if (t.status === 'completed') return false;
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= tomorrow; // All upcoming tasks
        });
        // Sort by due date so soonest appear first
        filtered.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        // Limit to first 5 upcoming tasks
        filtered = filtered.slice(0, 5);
      }
      break;

    case 'upcoming':
      filtered = tasks.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= tomorrow && due < nextWeek;
      });
      break;

    case 'completed':
      filtered = tasks.filter((t) => t.status === 'completed');
      break;

    case 'all':
    default:
      filtered = tasks.filter((t) => t.status === 'active');
  }

  // Apply category filter if set
  if (activeCategory) {
    filtered = filtered.filter((t) => t.category === activeCategory);
  }

  return filtered;
}

/**
 * Count tasks for today (including those without due dates).
 */
export function selectTodayTaskCount(tasks: Task[]): number {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return tasks.filter((t) => {
    if (t.status === 'completed') return false;
    if (!t.dueDate) return true;
    return new Date(t.dueDate) < tomorrow;
  }).length;
}

/**
 * Count tasks completed today.
 */
export function selectCompletedTodayCount(tasks: Task[]): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    return new Date(t.completedAt) >= today;
  }).length;
}

/**
 * Get unique categories from all tasks (sorted).
 */
export function selectUniqueCategories(tasks: Task[]): string[] {
  const categories = tasks
    .map((t) => t.category)
    .filter((c): c is string => c !== null && c !== undefined);
  return [...new Set(categories)].sort();
}
