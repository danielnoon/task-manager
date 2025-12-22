// Task priority levels
export type Priority = 'low' | 'medium' | 'high';

// Task status
export type TaskStatus = 'active' | 'completed';

// Recurrence types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

// Core task interface
export interface Task {
    id: string;
    content: string;
    notes: string | null; // Rich notes/context
    category: string | null;
    priority: Priority | null;
    dueDate: Date | null;
    dueTime: string | null; // Optional time in HH:mm format
    // Recurrence
    recurrence: RecurrenceType;
    recurrenceInterval: number; // Every N days/weeks/months
    recurrenceDays: string | null; // For weekly: comma-separated days (0=Sun, 1=Mon, etc.)
    recurrenceEndDate: Date | null;
    lastNotifiedAt: Date | null;
    // Status
    status: TaskStatus;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    seriesId: string | null;
    // Focus / Planning
    estimatedDuration: number | null; // Minutes
    difficulty: 'easy' | 'medium' | 'hard' | null;
    focusDate: string | null; // YYYY-MM-DD
    focusOrder: number | null;
}

// AI analysis result
// AI analysis result with full attributes
export interface ExtendedTaskAnalysis extends TaskAnalysis {
    cleanedContent: string;
    dueTime: string | null;
    recurrence: RecurrenceType;
    recurrenceInterval: number;
    recurrenceDays: string | null;
}

export interface TaskAnalysis {
    category: string | null;
    priority: Priority;
    suggestedDueDate: Date | null;
    reasoning?: string;
}

// Nudge types
export type NudgeType =
    | 'welcome'
    | 'morning-checkin'
    | 'midday-checkin'
    | 'overdue-reminder'
    | 'due-date-prompt'
    | 'progress-check'
    | 'completion-celebration'
    | 'empty-inbox';

export interface Nudge {
    id: string;
    type: NudgeType;
    message: string;
    taskIds?: string[];
    actions?: NudgeAction[];
    createdAt: Date;
    dismissed: boolean;
}

export interface NudgeAction {
    label: string;
    action: 'dismiss' | 'complete' | 'reschedule' | 'add-note' | 'view-tasks';
    taskId?: string;
}

// Settings
export interface Settings {
    aiProvider: 'openai' | 'anthropic' | 'local';
    apiKey: string | null;
    theme: 'light' | 'dark' | 'system';
    morningCheckinTime: string; // HH:mm format
    middayCheckinTime: string;
    notificationsEnabled: boolean;
}

// View filter
export type ViewFilter = 'today' | 'upcoming' | 'all' | 'completed';

// Focus Queue (cached daily plan)
export interface FocusQueue {
    focusedTaskIds: string[];
    reasoning: string;
    generatedAt: Date;
}

// IPC channel names (for type safety)
export const IPC_CHANNELS = {
    // Tasks
    TASK_CREATE: 'task:create',
    TASK_UPDATE: 'task:update',
    TASK_DELETE: 'task:delete',
    TASK_GET_ALL: 'task:get-all',
    TASK_ANALYZE: 'task:analyze',

    // Nudges
    NUDGE_GET: 'nudge:get',
    NUDGE_DISMISS: 'nudge:dismiss',

    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_UPDATE: 'settings:update',

    // AI
    AI_ANALYZE: 'ai:analyze',
    AI_PROCESS_COMMAND: 'ai:process-command',

    // Quick Entry / Planning
    TASK_PLAN_DAY: 'task:plan-day',

    // Focus Queue
    FOCUS_QUEUE_GET: 'focus-queue:get',

    // Quick Entry
    QUICK_ENTRY_CLOSE: 'quick-entry:close',
};

