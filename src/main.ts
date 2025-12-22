import { app, BrowserWindow, ipcMain, nativeTheme, Notification, shell, globalShortcut } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { eq, desc } from 'drizzle-orm';
import { IPC_CHANNELS, Task, TaskAnalysis, Settings } from './lib/types';
import { initializeAI, analyzeTask, generateNudge, processAtMention, generateDailyPlan } from './main/ai-service';
import { initDatabase, getDatabase, closeDatabase } from './main/db';
import { tasks as tasksTable, settings as settingsTable, nudges as nudgesTable } from './main/db/schema';
import { initNotificationScheduler, cleanupNotificationScheduler, updateNotificationSchedule } from './main/notification-service';
import { getCachedFocusQueue, initFocusQueueOnStartup, setMainWindow } from './main/focus-queue-service';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Declare mainWindow at module level
let mainWindow: BrowserWindow | null = null;
let quickEntryWindow: BrowserWindow | null = null;
let isQuitting = false;

// Helper to convert DB row to Task type
function rowToTask(row: typeof tasksTable.$inferSelect): Task {
  return {
    id: row.id,
    content: row.content,
    notes: row.notes,
    status: row.status as 'active' | 'completed',
    priority: row.priority as 'low' | 'medium' | 'high' | null,
    category: row.category,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    recurrence: (row.recurrence || 'none') as 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',
    recurrenceInterval: row.recurrenceInterval ?? 1,
    recurrenceDays: row.recurrenceDays,
    recurrenceEndDate: row.recurrenceEndDate,
    lastNotifiedAt: row.lastNotifiedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    seriesId: row.seriesId,
    estimatedDuration: row.estimatedDuration,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard' | null,
    focusDate: row.focusDate,
    focusOrder: row.focusOrder,
  };
}

// Helper to convert DB row to Settings type
function rowToSettings(row: typeof settingsTable.$inferSelect): Settings {
  return {
    aiProvider: row.aiProvider as 'openai' | 'anthropic' | 'local',
    apiKey: row.apiKey,
    theme: row.theme as 'dark' | 'light' | 'system',
    morningCheckinTime: row.morningCheckinTime,
    middayCheckinTime: row.middayCheckinTime,
    notificationsEnabled: row.notificationsEnabled,
  };
}

const createQuickEntryWindow = () => {
  quickEntryWindow = new BrowserWindow({
    width: 900, // Wider to accommodate padding
    height: 600, // Tall enough for autocomplete suggestions (overflows visible)
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Hides window instead of closing to keep state/speed
  quickEntryWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      quickEntryWindow?.hide();
    }
    return false;
  });

  // Hide on blur (clicking away)
  quickEntryWindow.on('blur', () => {
    if (quickEntryWindow?.isVisible()) {
      quickEntryWindow.hide();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    quickEntryWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#quick-entry`);
  } else {
    quickEntryWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: 'quick-entry' }
    );
  }
};

const createWindow = async () => {
  // Initialize database
  initDatabase();

  // Load settings from database
  const db = getDatabase();
  const settingsRows = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  const settings = settingsRows[0] ? rowToSettings(settingsRows[0]) : null;

  // Set theme
  if (settings) {
    nativeTheme.themeSource = settings.theme === 'system' ? 'system' : settings.theme;

    // Initialize AI if API key exists
    if (settings.apiKey) {
      initializeAI(settings.apiKey);
    }
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    backgroundColor: '#1A1917',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// ==================== IPC Handlers ====================

// Task CRUD
ipcMain.handle(IPC_CHANNELS.TASK_GET_ALL, async () => {
  const db = getDatabase();
  const rows = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
  return rows.map(rowToTask);
});

// Helper to parse dates from IPC, handling YYYY-MM-DD as local time
function parseIPCDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  // If exact YYYY-MM-DD string, treat as local date (00:00:00)
  // This prevents "Dec 21" (UTC) becoming "Dec 20 6pm" (CST)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T00:00:00');
  }

  return new Date(value);
}

ipcMain.handle(IPC_CHANNELS.TASK_CREATE, async (_, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  const db = getDatabase();
  const now = new Date();
  const id = crypto.randomUUID();
  const seriesId = taskData.seriesId || id;

  // Convert string dates back to Date objects if coming from IPC
  const dueDate = parseIPCDate(taskData.dueDate);
  const recurrenceEndDate = parseIPCDate(taskData.recurrenceEndDate);
  const completedAt = parseIPCDate(taskData.completedAt);
  const lastNotifiedAt = parseIPCDate(taskData.lastNotifiedAt);

  await db.insert(tasksTable).values({
    id,
    content: taskData.content,
    notes: taskData.notes,
    status: taskData.status || 'active',
    priority: taskData.priority,
    category: taskData.category,
    dueDate: dueDate,
    dueTime: taskData.dueTime,
    recurrence: taskData.recurrence || 'none',
    recurrenceInterval: taskData.recurrenceInterval ?? 1,
    recurrenceDays: taskData.recurrenceDays,
    recurrenceEndDate: recurrenceEndDate,
    lastNotifiedAt: lastNotifiedAt,
    completedAt: completedAt,
    createdAt: now,
    updatedAt: now,
    seriesId: seriesId,
  });

  const newTask: Task = {
    ...taskData,
    id,
    dueDate,
    recurrenceEndDate,
    completedAt,
    lastNotifiedAt,
    createdAt: now,
    updatedAt: now,
    seriesId,
  };

  // Notify main window to refresh
  mainWindow?.webContents.send('task:refresh');
  return newTask;
});

ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, async (_, id: string, updates: Partial<Task>) => {
  const db = getDatabase();
  const now = new Date();

  // Convert string dates back to Date objects if present in updates
  const updatePayload: any = { ...updates };
  if (updates.dueDate !== undefined) updatePayload.dueDate = parseIPCDate(updates.dueDate);
  if (updates.recurrenceEndDate !== undefined) updatePayload.recurrenceEndDate = parseIPCDate(updates.recurrenceEndDate);
  if (updates.completedAt !== undefined) updatePayload.completedAt = parseIPCDate(updates.completedAt);
  if (updates.lastNotifiedAt !== undefined) updatePayload.lastNotifiedAt = parseIPCDate(updates.lastNotifiedAt);

  updatePayload.updatedAt = now;

  await db.update(tasksTable)
    .set(updatePayload)
    .where(eq(tasksTable.id, id));

  // Fetch updated task
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  return rows[0] ? rowToTask(rows[0]) : null;
});

ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_, id: string) => {
  const db = getDatabase();
  const result = await db.delete(tasksTable).where(eq(tasksTable.id, id));
  return true;
});

// AI Analysis
ipcMain.handle(IPC_CHANNELS.AI_ANALYZE, async (_, content: string): Promise<TaskAnalysis> => {
  return await analyzeTask(content);
});

// Settings
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
  const db = getDatabase();
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return rows[0] ? rowToSettings(rows[0]) : null;
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, updates: Partial<Settings>) => {
  const db = getDatabase();

  await db.update(settingsTable)
    .set({
      aiProvider: updates.aiProvider,
      apiKey: updates.apiKey,
      theme: updates.theme,
      morningCheckinTime: updates.morningCheckinTime,
      middayCheckinTime: updates.middayCheckinTime,
      notificationsEnabled: updates.notificationsEnabled,
    })
    .where(eq(settingsTable.id, 1));

  // Update theme if changed
  if (updates.theme) {
    nativeTheme.themeSource = updates.theme === 'system' ? 'system' : updates.theme;
  }

  // Initialize AI if API key is set
  if (updates.apiKey && updates.apiKey.length > 0) {
    initializeAI(updates.apiKey);
  }

  // Refresh notification schedules if timing or enabled state changed
  if (updates.morningCheckinTime || updates.middayCheckinTime || updates.notificationsEnabled !== undefined) {
    await updateNotificationSchedule(mainWindow);
  }

  const rows = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return rows[0] ? rowToSettings(rows[0]) : null;
});

ipcMain.handle(IPC_CHANNELS.TASK_PLAN_DAY, async () => {
  const db = getDatabase();
  // Get active tasks
  const activeTasks = await db.select().from(tasksTable).where(eq(tasksTable.status, 'active'));

  // Generate plan
  const plan = await generateDailyPlan(activeTasks as any[]); // Cast because DB types vs Interface types might differ slightly

  // Apply plan to DB
  const todayStr = new Date().toISOString().split('T')[0];

  // Reset focus for today first? Or just overwrite?
  // Let's overwrite.

  for (let i = 0; i < plan.focusedTaskIds.length; i++) {
    const taskId = plan.focusedTaskIds[i];
    await db.update(tasksTable)
      .set({
        focusDate: todayStr,
        focusOrder: i
      })
      .where(eq(tasksTable.id, taskId));
  }

  return plan;
});

// Focus Queue
ipcMain.handle(IPC_CHANNELS.FOCUS_QUEUE_GET, async () => {
  return await getCachedFocusQueue();
});

// AI Command Processing
ipcMain.handle(IPC_CHANNELS.AI_PROCESS_COMMAND, async (_, { command, activeTasks }: { command: string, activeTasks: { id: string, content: string }[] }) => {
  return await processAtMention(command, activeTasks);
});

// Nudges
ipcMain.handle(IPC_CHANNELS.NUDGE_GET, async () => {
  const db = getDatabase();
  // Get latest active nudge
  const rows = await db.select().from(nudgesTable)
    .where(eq(nudgesTable.dismissed, false))
    .orderBy(desc(nudgesTable.createdAt))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    taskIds: row.taskIds ? JSON.parse(row.taskIds) : [],
    createdAt: row.createdAt,
    dismissed: row.dismissed,
  };
});

ipcMain.handle(IPC_CHANNELS.NUDGE_DISMISS, async (_, id: string) => {
  const db = getDatabase();
  await db.update(nudgesTable)
    .set({ dismissed: true })
    .where(eq(nudgesTable.id, id));
  return true;
});

// Quick Entry
ipcMain.on(IPC_CHANNELS.QUICK_ENTRY_CLOSE, (_, showMain) => {
  quickEntryWindow?.hide();
  if (showMain && mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Force refresh explicitly
    mainWindow.webContents.send('task:refresh');
  }
});

// ==================== App Lifecycle ====================

app.on('ready', async () => {
  await createWindow();
  createQuickEntryWindow();

  // Set main window reference for focus queue updates
  setMainWindow(mainWindow);

  // Register Global Shortcut
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (quickEntryWindow) {
      if (quickEntryWindow.isVisible()) {
        quickEntryWindow.hide();
      } else {
        quickEntryWindow.show();
        quickEntryWindow.focus();
        // Force web contents focus
        quickEntryWindow.webContents.focus();
      }
    } else {
      createQuickEntryWindow();
    }
  });

  // Initialize notification scheduler after window is created
  await initNotificationScheduler(mainWindow);

  // Initialize Focus Queue on startup (generate or use cached)
  await initFocusQueueOnStartup();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupNotificationScheduler();
    closeDatabase();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  cleanupNotificationScheduler();
  closeDatabase();
});

