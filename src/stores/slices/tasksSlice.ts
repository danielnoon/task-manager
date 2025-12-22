import { StateCreator } from 'zustand';
import { Task } from '../../lib/types';
import { withIPC } from '../utils/ipcWrapper';
import { calculateNextDueDate } from '../utils/recurrence';

/**
 * Result type for addTask - replaces magic error throws with discriminated union.
 * Either a task was created, or a command was executed.
 */
export type AddTaskResult =
  | { type: 'task_created'; task: Task }
  | { type: 'command_executed'; message: string; updatedTaskId?: string };

export interface TasksSlice {
  // State
  tasks: Task[];
  isLoading: boolean;
  isAnalyzing: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (content: string) => Promise<AddTaskResult>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  appendNote: (taskId: string, note: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  findTaskByContent: (searchText: string) => Task | null;
}

export const createTasksSlice: StateCreator<TasksSlice> = (set, get) => ({
  // Initial state
  tasks: [],
  isLoading: true,
  isAnalyzing: false,

  // Load all tasks from main process
  loadTasks: async () => {
    await withIPC(
      async () => {
        const tasks = await window.drift.tasks.getAll();
        set({ tasks });
      },
      set,
      'isLoading'
    );
  },

  // Add a new task with AI analysis or process a command
  addTask: async (content: string): Promise<AddTaskResult> => {
    return await withIPC(
      async () => {
        // Check for @mention command
        if (content.trim().startsWith('@')) {
          const activeTasks = get().tasks.map(t => ({ id: t.id, content: t.content }));
          const result = await window.drift.ai.processCommand(content, activeTasks);

          if (result.taskId) {
            // Handle notes separately to append instead of overwrite
            if (result.updates.notes) {
              await get().appendNote(result.taskId, result.updates.notes);
              // Remove notes from updates so updateTask doesn't overwrite
              delete result.updates.notes;
            }

            // Apply other updates if any remain
            if (Object.keys(result.updates).length > 0) {
              await get().updateTask(result.taskId, result.updates);
            }
          }

          return {
            type: 'command_executed' as const,
            message: result.confirmation,
            updatedTaskId: result.taskId
          };
        }

        // Normal task creation - analyze with AI
        const analysis = await window.drift.ai.analyze(content);

        // Create the task with AI suggestions
        const newTask = await window.drift.tasks.create({
          content: analysis.cleanedContent, // Use cleaned content without scheduling info
          notes: null,
          category: analysis.category,
          priority: analysis.priority,
          dueDate: analysis.suggestedDueDate,
          dueTime: analysis.dueTime,
          recurrence: analysis.recurrence,
          recurrenceInterval: analysis.recurrenceInterval,
          recurrenceDays: analysis.recurrenceDays,
          recurrenceEndDate: null,
          lastNotifiedAt: null,
          status: 'active',
          completedAt: null,
          seriesId: crypto.randomUUID(),
          estimatedDuration: null,
          difficulty: null,
          focusDate: null,
          focusOrder: null,
        });

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        return { type: 'task_created' as const, task: newTask };
      },
      set,
      'isAnalyzing'
    );
  },

  // Update a task
  updateTask: async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await window.drift.tasks.update(id, updates);
      if (updatedTask) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        }));
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  },

  // Delete a task
  deleteTask: async (id: string) => {
    try {
      await window.drift.tasks.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  },

  // Clear all completed tasks
  clearCompleted: async () => {
    const completedTasks = get().tasks.filter(t => t.status === 'completed');

    // Optimistically update UI
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'completed'),
    }));

    // Delete in background
    for (const task of completedTasks) {
      try {
        await window.drift.tasks.delete(task.id);
      } catch (error) {
        console.error(`Failed to delete task ${task.id}:`, error);
      }
    }
  },

  // Toggle task completion
  toggleComplete: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const isCompleting = task.status === 'active';
    const updates: Partial<Task> = {
      status: isCompleting ? 'completed' : 'active',
      completedAt: isCompleting ? new Date() : null,
    };

    try {
      const updatedTask = await window.drift.tasks.update(id, updates);
      if (updatedTask) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        }));

        // Auto-regenerate recurring tasks
        if (isCompleting && task.recurrence !== 'none' && task.dueDate) {
          const nextDueDate = calculateNextDueDate(
            task.dueDate,
            task.recurrence,
            task.recurrenceInterval,
            task.recurrenceDays
          );

          // Check if within end date
          if (!task.recurrenceEndDate || nextDueDate <= task.recurrenceEndDate) {
            // Use seriesId if available, or current task ID as root of new series
            const nextSeriesId = task.seriesId || task.id;

            // Check if duplicate already exists (idempotency)
            const duplicateExists = get().tasks.some(t => {
              if (t.status !== 'active' || !t.dueDate) return false;

              const sameDate = new Date(t.dueDate).getTime() === nextDueDate.getTime();
              const sameSeries = t.seriesId === nextSeriesId;
              const sameContent = t.content === task.content;

              return sameDate && (sameSeries || sameContent);
            });

            if (duplicateExists) return;

            // Create the next occurrence
            const nextTask = await window.drift.tasks.create({
              content: task.content,
              notes: task.notes,
              category: task.category,
              priority: task.priority,
              dueDate: nextDueDate,
              dueTime: task.dueTime,
              recurrence: task.recurrence,
              recurrenceInterval: task.recurrenceInterval,
              recurrenceDays: task.recurrenceDays,
              recurrenceEndDate: task.recurrenceEndDate,
              lastNotifiedAt: null,
              status: 'active',
              completedAt: null,
              seriesId: nextSeriesId,
              estimatedDuration: task.estimatedDuration,
              difficulty: task.difficulty,
              focusDate: null,
              focusOrder: null,
            });

            set((state) => ({
              tasks: [nextTask, ...state.tasks],
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  },

  // Append a note to an existing task
  appendNote: async (taskId: string, note: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Append to existing notes or create new
    const existingNotes = task.notes || '';
    const timestamp = new Date().toLocaleString();
    const newNotes = existingNotes
      ? `${existingNotes}\n\n---\n[${timestamp}]\n${note}`
      : `[${timestamp}]\n${note}`;

    try {
      const updatedTask = await window.drift.tasks.update(taskId, { notes: newNotes });
      if (updatedTask) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
        }));
      }
    } catch (error) {
      console.error('Failed to append note:', error);
    }
  },

  // Find a task by partial content match (case-insensitive)
  findTaskByContent: (searchText: string) => {
    const { tasks } = get();
    const lowerSearch = searchText.toLowerCase().trim();

    // First try exact match
    let match = tasks.find((t) =>
      t.status === 'active' && t.content.toLowerCase() === lowerSearch
    );

    // Then try partial match (starts with)
    if (!match) {
      match = tasks.find((t) =>
        t.status === 'active' && t.content.toLowerCase().startsWith(lowerSearch)
      );
    }

    // Finally try includes
    if (!match) {
      match = tasks.find((t) =>
        t.status === 'active' && t.content.toLowerCase().includes(lowerSearch)
      );
    }

    return match || null;
  },
});
