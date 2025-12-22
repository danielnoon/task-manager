import { create } from 'zustand';
import { Task, ViewFilter, Settings, Nudge, TaskAnalysis, RecurrenceType, FocusQueue } from '../lib/types';
import { addDays, addWeeks, addMonths, getDay } from 'date-fns';

// Helper to calculate the next due date for recurring tasks
function calculateNextDueDate(
    currentDueDate: Date,
    recurrence: RecurrenceType,
    interval: number,
    recurrenceDays: string | null
): Date {
    const current = new Date(currentDueDate);

    switch (recurrence) {
        case 'daily':
            return addDays(current, interval);

        case 'weekly':
            if (recurrenceDays) {
                // Find the next matching day
                const days = recurrenceDays.split(',').map(Number);
                const currentDay = getDay(current);
                const sortedDays = [...days].sort((a, b) => a - b);

                // Find next day in the same week or next week
                let nextDay = sortedDays.find(d => d > currentDay);
                if (nextDay !== undefined) {
                    return addDays(current, nextDay - currentDay);
                } else {
                    // Wrap to first day of next week cycle
                    const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
                    return addDays(current, daysUntilNextWeek + (interval - 1) * 7);
                }
            }
            return addWeeks(current, interval);

        case 'monthly':
            return addMonths(current, interval);

        case 'custom':
            // For now, custom behaves like daily with variable interval
            return addDays(current, interval);

        default:
            return current;
    }
}

interface TaskStore {
    // State
    tasks: Task[];
    isLoading: boolean;
    activeFilter: ViewFilter;
    activeCategory: string | null; // null means "all categories"
    isAnalyzing: boolean;
    activeNudge: Nudge | null;
    settings: Settings | null;
    focusQueue: FocusQueue | null; // Cached daily plan

    // Task actions
    loadTasks: () => Promise<void>;
    loadActiveNudge: () => Promise<void>;
    dismissNudge: () => Promise<void>;
    addTask: (content: string) => Promise<Task>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    toggleComplete: (id: string) => Promise<void>;
    appendNote: (taskId: string, note: string) => Promise<void>;
    clearCompleted: () => Promise<void>;

    // Filter actions
    setFilter: (filter: ViewFilter) => void;
    setCategoryFilter: (category: string | null) => void;

    // Settings actions
    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<Settings>) => Promise<void>;

    // Planning
    planMyDay: () => Promise<void>;
    loadFocusQueue: () => Promise<void>;
    setFocusQueue: (queue: FocusQueue) => void;

    // Computed
    filteredTasks: () => Task[];
    todayTaskCount: () => number;
    completedTodayCount: () => number;
    uniqueCategories: () => string[];
    findTaskByContent: (searchText: string) => Task | null;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
    // Initial state
    tasks: [],
    isLoading: true,
    activeFilter: 'today',
    activeCategory: null,
    isAnalyzing: false,
    nudges: [],
    activeNudge: null,
    settings: null,
    focusQueue: null,

    // Load all tasks from main process
    loadTasks: async () => {
        set({ isLoading: true });
        try {
            const tasks = await window.drift.tasks.getAll();
            set({ tasks, isLoading: false });
        } catch (error) {
            console.error('Failed to load tasks:', error);
            set({ isLoading: false });
        }
    },

    loadActiveNudge: async () => {
        try {
            const nudge = await window.drift.nudges.getActive();
            set({ activeNudge: nudge });
        } catch (error) {
            console.error('Failed to load active nudge:', error);
        }
    },

    dismissNudge: async () => {
        const { activeNudge } = get();
        if (!activeNudge) return;

        try {
            await window.drift.nudges.dismiss(activeNudge.id);
            set({ activeNudge: null });
        } catch (error) {
            console.error('Failed to dismiss nudge:', error);
        }
    },

    planMyDay: async () => {
        set({ isAnalyzing: true });
        try {
            const plan = await window.drift.tasks.planDay();
            set({
                focusQueue: {
                    focusedTaskIds: plan.focusedTaskIds,
                    reasoning: plan.reasoning,
                    generatedAt: new Date()
                },
                isAnalyzing: false
            });
        } catch (error) {
            console.error('Failed to plan day:', error);
            set({ isAnalyzing: false });
        }
    },

    loadFocusQueue: async () => {
        try {
            const queue = await window.drift.focusQueue.get();
            set({ focusQueue: queue });
        } catch (error) {
            console.error('Failed to load focus queue:', error);
        }
    },

    setFocusQueue: (queue: FocusQueue) => {
        set({ focusQueue: queue });
    },

    // Add a new task with AI analysis or process a command
    addTask: async (content: string) => {
        set({ isAnalyzing: true });

        try {
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

                set({ isAnalyzing: false });

                // Return a dummy task or handle this better? 
                // Since this function expects to return a Task, but we performed an update.
                // We'll throw a special error or return the updated task if finding it.
                // For now, let's just return the found task or throw if not found to signal "command processed"
                if (result.taskId) {
                    const updatedTask = get().tasks.find(t => t.id === result.taskId);
                    if (updatedTask) return updatedTask;
                }
                throw new Error(`Command processed: ${result.confirmation}`);
            }

            // Normal task creation
            // First, analyze the task with AI
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
                isAnalyzing: false,
            }));

            return newTask;
        } catch (error) {
            console.error('Failed to add task or process command:', error);
            set({ isAnalyzing: false });
            throw error;
        }
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
                // In a real app we might revert state here, but for local DB simple log is okay
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
                        // This prevents creating duplicates if user unchecks and re-checks today's task
                        const duplicateExists = get().tasks.some(t => {
                            if (t.status !== 'active' || !t.dueDate) return false;

                            const sameDate = new Date(t.dueDate).getTime() === nextDueDate.getTime();
                            const sameSeries = t.seriesId === nextSeriesId;
                            // Fallback to content match for legacy tasks or if seriesId logic fails
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
                            seriesId: nextSeriesId, // Propagate series ID
                            estimatedDuration: task.estimatedDuration, // Keep estimated duration
                            difficulty: task.difficulty, // Keep difficulty
                            focusDate: null, // Reset focus
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

    // Set active filter
    setFilter: (filter: ViewFilter) => {
        set({ activeFilter: filter });
    },

    // Set category filter
    setCategoryFilter: (category: string | null) => {
        set({ activeCategory: category });
    },

    // Load settings
    loadSettings: async () => {
        try {
            const settings = await window.drift.settings.get();
            set({ settings });
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    // Update settings
    updateSettings: async (updates: Partial<Settings>) => {
        try {
            const settings = await window.drift.settings.update(updates);
            set({ settings });
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    },

    // Get filtered tasks based on active filter and category
    filteredTasks: () => {
        const { tasks, activeFilter, activeCategory } = get();
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
    },

    // Count of tasks for today
    todayTaskCount: () => {
        const { tasks } = get();
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        return tasks.filter((t) => {
            if (t.status === 'completed') return false;
            if (!t.dueDate) return true;
            return new Date(t.dueDate) < tomorrow;
        }).length;
    },

    // Count of tasks completed today
    completedTodayCount: () => {
        const { tasks } = get();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return tasks.filter((t) => {
            if (t.status !== 'completed' || !t.completedAt) return false;
            return new Date(t.completedAt) >= today;
        }).length;
    },

    // Get unique categories from all tasks
    uniqueCategories: () => {
        const { tasks } = get();
        const categories = tasks
            .map((t) => t.category)
            .filter((c): c is string => c !== null && c !== undefined);
        return [...new Set(categories)].sort();
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
}));
