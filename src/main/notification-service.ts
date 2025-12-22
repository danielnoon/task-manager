import { Notification, BrowserWindow } from 'electron';
import schedule from 'node-schedule';
import crypto from 'node:crypto';
import { getDatabase } from './db';
import { settings as settingsTable, tasks as tasksTable, nudges as nudgesTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { generateNudge } from './ai-service';
import { Priority } from '../lib/types';
import { regenerateFocusQueue } from './focus-queue-service';

// Track scheduled jobs
let morningJob: schedule.Job | null = null;
let middayJob: schedule.Job | null = null;
let overdueCheckJob: schedule.Job | null = null;
let dueTimeCheckJob: schedule.Job | null = null;

export interface NotificationPayload {
    title: string;
    body: string;
    taskIds?: string[];
}

// Helper to get tasks in format generateNudge expects
async function getTasksForNudge() {
    const db = getDatabase();
    const activeTasks = await db.select().from(tasksTable)
        .where(eq(tasksTable.status, 'active'));

    const now = new Date();
    return activeTasks.map(task => ({
        content: task.content,
        priority: task.priority as Priority | null,
        isOverdue: task.dueDate ? new Date(task.dueDate) < now : false,
    }));
}

// Helper to save nudge to DB
async function saveNudge(type: string, message: string, taskIds: string[] = []) {
    const db = getDatabase();
    await db.insert(nudgesTable).values({
        id: crypto.randomUUID(),
        type,
        message,
        taskIds: taskIds.length > 0 ? JSON.stringify(taskIds) : null,
        createdAt: new Date(),
        dismissed: false,
    });
}

// Initialize the notification scheduler
export async function initNotificationScheduler(mainWindow: BrowserWindow | null) {
    console.log('Initializing notification scheduler...');

    const db = getDatabase();
    const settingsRows = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
    const settings = settingsRows[0];

    if (!settings?.notificationsEnabled) {
        console.log('Notifications disabled in settings');
        return;
    }

    // Schedule morning check-in
    scheduleMorningCheckin(settings.morningCheckinTime, mainWindow);

    // Schedule mid-day check-in
    scheduleMiddayCheckin(settings.middayCheckinTime, mainWindow);

    // Schedule overdue task check (every hour)
    scheduleOverdueCheck(mainWindow);

    // Schedule due-time notifications (every minute)
    scheduleDueTimeCheck(mainWindow);

    console.log('Notification scheduler initialized');
}

function scheduleMorningCheckin(time: string, mainWindow: BrowserWindow | null) {
    if (morningJob) morningJob.cancel();

    const [hour, minute] = time.split(':').map(Number);

    morningJob = schedule.scheduleJob({ hour, minute }, async () => {
        console.log('Running morning check-in...');

        const tasks = await getTasksForNudge();
        const nudgeMessage = await generateNudge(tasks, 'morning');

        // Save to DB
        await saveNudge('morning-checkin', nudgeMessage);

        showNotification({
            title: '☀️ Good Morning!',
            body: nudgeMessage,
        }, mainWindow);

        // Regenerate Focus Queue at morning check-in
        await regenerateFocusQueue();
    });

    console.log(`Morning check-in scheduled for ${time}`);
}

function scheduleMiddayCheckin(time: string, mainWindow: BrowserWindow | null) {
    if (middayJob) middayJob.cancel();

    const [hour, minute] = time.split(':').map(Number);

    middayJob = schedule.scheduleJob({ hour, minute }, async () => {
        console.log('Running mid-day check-in...');

        const tasks = await getTasksForNudge();
        const nudgeMessage = await generateNudge(tasks, 'midday');

        // Save to DB
        await saveNudge('midday-checkin', nudgeMessage);

        showNotification({
            title: '🌤️ Afternoon Check-in',
            body: nudgeMessage,
        }, mainWindow);

        // Regenerate Focus Queue at midday check-in
        await regenerateFocusQueue();
    });

    console.log(`Mid-day check-in scheduled for ${time}`);
}

function scheduleOverdueCheck(mainWindow: BrowserWindow | null) {
    if (overdueCheckJob) overdueCheckJob.cancel();

    // Run every hour at :30
    overdueCheckJob = schedule.scheduleJob('30 * * * *', async () => {
        const db = getDatabase();
        const now = new Date();

        const activeTasks = await db.select().from(tasksTable)
            .where(eq(tasksTable.status, 'active'));

        const overdueTasks = activeTasks.filter(task => {
            if (!task.dueDate) return false;
            return new Date(task.dueDate) < now;
        });

        if (overdueTasks.length > 0) {
            const count = overdueTasks.length;
            const message = count === 1
                ? `You have 1 overdue task: "${overdueTasks[0].content.slice(0, 40)}..."`
                : `You have ${count} overdue tasks that need attention`;

            // Save to DB
            const taskIds = overdueTasks.map(t => t.id);
            await saveNudge('overdue-reminder', message, taskIds);

            showNotification({
                title: '⏰ Overdue Tasks',
                body: message,
                taskIds: taskIds,
            }, mainWindow);
        }
    });

    console.log('Overdue task check scheduled (every hour at :30)');
}

// Check for tasks with specific due times
function scheduleDueTimeCheck(mainWindow: BrowserWindow | null) {
    if (dueTimeCheckJob) dueTimeCheckJob.cancel();

    // Run every minute to check for due-time notifications
    dueTimeCheckJob = schedule.scheduleJob('* * * * *', async () => {
        const db = getDatabase();
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const activeTasks = await db.select().from(tasksTable)
            .where(eq(tasksTable.status, 'active'));

        // Find tasks due today with matching time that haven't been notified
        for (const task of activeTasks) {
            if (!task.dueTime || !task.dueDate) continue;

            const dueDate = new Date(task.dueDate);
            const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            // Check if due today and time matches
            if (taskDate.getTime() === today.getTime() && task.dueTime === currentTime) {
                // Check if we already notified for this
                if (task.lastNotifiedAt) {
                    const lastNotified = new Date(task.lastNotifiedAt);
                    // Don't notify if we notified within the last minute
                    if (now.getTime() - lastNotified.getTime() < 60000) continue;
                }

                // Show notification
                showNotification({
                    title: '⏰ Task Due Now',
                    body: task.content,
                    taskIds: [task.id],
                }, mainWindow);

                // Update lastNotifiedAt
                await db.update(tasksTable)
                    .set({ lastNotifiedAt: now })
                    .where(eq(tasksTable.id, task.id));
            }
        }
    });

    console.log('Due-time check scheduled (every minute)');
}

function showNotification(payload: NotificationPayload, mainWindow: BrowserWindow | null) {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: payload.title,
            body: payload.body,
            silent: false,
        });

        notification.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });

        notification.show();
    }

    // Also send to renderer for in-app display
    if (mainWindow) {
        mainWindow.webContents.send('notification', payload);
    }
}

export async function updateNotificationSchedule(mainWindow: BrowserWindow | null) {
    if (morningJob) morningJob.cancel();
    if (middayJob) middayJob.cancel();
    if (overdueCheckJob) overdueCheckJob.cancel();
    if (dueTimeCheckJob) dueTimeCheckJob.cancel();
    await initNotificationScheduler(mainWindow);
}

export function cleanupNotificationScheduler() {
    if (morningJob) morningJob.cancel();
    if (middayJob) middayJob.cancel();
    if (overdueCheckJob) overdueCheckJob.cancel();
    if (dueTimeCheckJob) dueTimeCheckJob.cancel();
    console.log('Notification scheduler cleaned up');
}
