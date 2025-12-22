import { BrowserWindow } from 'electron';
import { getDatabase } from './db';
import { tasks as tasksTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { generateDailyPlan } from './ai-service';
import { FocusQueue } from '../lib/types';

// Store mainWindow reference for sending updates
let mainWindowRef: BrowserWindow | null = null;

/**
 * Set the main window reference for sending focus queue updates
 */
export function setMainWindow(window: BrowserWindow | null) {
    mainWindowRef = window;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get the cached Focus Queue for today from the database
 * Returns null if no queue exists for today
 */
export async function getCachedFocusQueue(): Promise<FocusQueue | null> {
    const db = getDatabase();
    const todayStr = getTodayString();

    // Find tasks with focusDate = today, ordered by focusOrder
    const focusedTasks = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.focusDate, todayStr));

    if (focusedTasks.length === 0) {
        return null;
    }

    // Sort by focusOrder
    focusedTasks.sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

    return {
        focusedTaskIds: focusedTasks.map(t => t.id),
        reasoning: 'Cached from earlier today',
        generatedAt: new Date(),
    };
}

/**
 * Generate a new Focus Queue and cache it to the database
 * Returns the generated queue
 */
export async function generateAndCacheFocusQueue(): Promise<FocusQueue> {
    console.log('[FocusQueue] Generating new focus queue...');

    const db = getDatabase();
    const todayStr = getTodayString();

    // Get all active tasks
    const activeTasks = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.status, 'active'));

    // Generate plan via AI
    const plan = await generateDailyPlan(activeTasks as any[]);

    // Clear any existing focus entries for today first
    // (in case we're regenerating)
    await db.update(tasksTable)
        .set({ focusDate: null, focusOrder: null })
        .where(eq(tasksTable.focusDate, todayStr));

    // Apply new focus queue to DB
    for (let i = 0; i < plan.focusedTaskIds.length; i++) {
        const taskId = plan.focusedTaskIds[i];
        await db.update(tasksTable)
            .set({
                focusDate: todayStr,
                focusOrder: i
            })
            .where(eq(tasksTable.id, taskId));
    }

    const queue: FocusQueue = {
        focusedTaskIds: plan.focusedTaskIds,
        reasoning: plan.reasoning,
        generatedAt: new Date(),
    };

    console.log(`[FocusQueue] Generated queue with ${queue.focusedTaskIds.length} tasks`);

    // Notify renderer of the update
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('focus-queue:updated', queue);
    }

    return queue;
}

/**
 * Initialize Focus Queue on app startup
 * - If a cached queue exists for today, return it
 * - Otherwise, generate a new one
 */
export async function initFocusQueueOnStartup(): Promise<FocusQueue | null> {
    console.log('[FocusQueue] Initializing on startup...');

    // Check for cached queue
    const cached = await getCachedFocusQueue();
    if (cached) {
        console.log('[FocusQueue] Using cached queue from today');
        return cached;
    }

    // No cache, generate new queue
    try {
        return await generateAndCacheFocusQueue();
    } catch (error) {
        console.error('[FocusQueue] Failed to generate on startup:', error);
        return null;
    }
}

/**
 * Regenerate the Focus Queue (called at check-in times)
 */
export async function regenerateFocusQueue(): Promise<void> {
    console.log('[FocusQueue] Regenerating at check-in time...');
    try {
        await generateAndCacheFocusQueue();
    } catch (error) {
        console.error('[FocusQueue] Failed to regenerate:', error);
    }
}
