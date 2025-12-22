import { Task } from '../lib/types';

/**
 * Date utility functions for task management.
 * Extracted from taskStore selectors and components.
 */

/**
 * Check if a task is due today (or has no due date).
 */
export function isTaskDueToday(task: Task): boolean {
  if (task.status === 'completed') return false;
  if (!task.dueDate) return true; // Tasks without due dates show in Today

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const due = new Date(task.dueDate);

  return due < tomorrow;
}

/**
 * Check if a task is overdue (past due date and not completed).
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed') return false;
  if (!task.dueDate) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.dueDate);

  return due < today;
}

/**
 * Get tasks for a specific time period.
 */
export function getTasksForPeriod(
  tasks: Task[],
  period: 'today' | 'upcoming' | 'week'
): Task[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  switch (period) {
    case 'today':
      return tasks.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return true;
        const due = new Date(t.dueDate);
        return due < tomorrow;
      });

    case 'upcoming':
      return tasks.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= tomorrow && due < nextWeek;
      });

    case 'week':
      return tasks.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due < nextWeek;
      });

    default:
      return tasks;
  }
}

/**
 * Count tasks completed today.
 */
export function countCompletedToday(tasks: Task[]): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    return new Date(t.completedAt) >= today;
  }).length;
}

/**
 * Count tasks due today (including those without due dates).
 */
export function countDueToday(tasks: Task[]): number {
  return tasks.filter((t) => isTaskDueToday(t)).length;
}
