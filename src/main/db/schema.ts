import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Tasks table
export const tasks = sqliteTable('tasks', {
    id: text('id').primaryKey(),
    content: text('content').notNull(),
    notes: text('notes'), // Rich notes/context for the task
    status: text('status', { enum: ['active', 'completed'] }).notNull().default('active'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] }),
    category: text('category'),
    dueDate: integer('due_date', { mode: 'timestamp' }),
    dueTime: text('due_time'), // Optional time in HH:mm format
    // Recurrence fields
    recurrence: text('recurrence', { enum: ['none', 'daily', 'weekly', 'monthly', 'custom'] }).default('none'),
    recurrenceInterval: integer('recurrence_interval').default(1), // Every N days/weeks/months
    recurrenceDays: text('recurrence_days'), // For weekly: comma-separated days (0=Sun, 1=Mon, etc.)
    recurrenceEndDate: integer('recurrence_end_date', { mode: 'timestamp' }), // Optional end date
    lastNotifiedAt: integer('last_notified_at', { mode: 'timestamp' }), // For due-time notifications
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    seriesId: text('series_id'), // Links recurring tasks together

    // Improved Dashboard / Focus Mode fields
    estimatedDuration: integer('estimated_duration'), // Minutes
    difficulty: text('difficulty'), // 'easy', 'medium', 'hard' (or 1-5, but text is safer for now)
    focusDate: text('focus_date'), // YYYY-MM-DD string, set when "Plan My Day" selects it
    focusOrder: integer('focus_order'), // Order within the focus day
});

// Settings table (single row)
export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey().default(1),
    aiProvider: text('ai_provider').notNull().default('anthropic'),
    apiKey: text('api_key'),
    theme: text('theme', { enum: ['dark', 'light', 'system'] }).notNull().default('dark'),
    morningCheckinTime: text('morning_checkin_time').notNull().default('09:00'),
    middayCheckinTime: text('midday_checkin_time').notNull().default('13:00'),
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
});

// Nudges table (AI check-ins)
export const nudges = sqliteTable('nudges', {
    id: text('id').primaryKey(),
    type: text('type').notNull(), // morning-checkin, midday-checkin, overdue-reminder, etc
    message: text('message').notNull(),
    taskIds: text('task_ids'), // JSON string of related task IDs
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
});

// Type exports for use in the app
export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type SettingsRow = typeof settings.$inferSelect;
export type SettingsInsert = typeof settings.$inferInsert;
