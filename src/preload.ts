import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS, Task, TaskAnalysis, ExtendedTaskAnalysis, Settings, Nudge, FocusQueue } from './lib/types';

// Notification payload type
interface NotificationPayload {
    title: string;
    body: string;
    taskIds?: string[];
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('drift', {
    // Tasks
    tasks: {
        getAll: (): Promise<Task[]> => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_ALL),
        create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> =>
            ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, task),
        update: (id: string, updates: Partial<Task>): Promise<Task | null> =>
            ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, id, updates),
        delete: (id: string): Promise<boolean> =>
            ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, id),
        planDay: (): Promise<{ focusedTaskIds: string[], reasoning: string }> =>
            ipcRenderer.invoke(IPC_CHANNELS.TASK_PLAN_DAY),
    },

    // AI
    ai: {
        analyze: (content: string): Promise<TaskAnalysis> =>
            ipcRenderer.invoke(IPC_CHANNELS.AI_ANALYZE, content),
        processCommand: (command: string, activeTasks: { id: string, content: string }[]): Promise<{ taskId: string | null; updates: any; confirmation: string }> =>
            ipcRenderer.invoke(IPC_CHANNELS.AI_PROCESS_COMMAND, { command, activeTasks }),
    },

    // Settings
    settings: {
        get: (): Promise<Settings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
        update: (updates: Partial<Settings>): Promise<Settings> =>
            ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, updates),
    },

    // Notifications
    notifications: {
        onNotification: (callback: (payload: NotificationPayload) => void) => {
            const listener = (_event: IpcRendererEvent, payload: NotificationPayload) => callback(payload);
            ipcRenderer.on('notification', listener);
            // Return unsubscribe function
            return () => ipcRenderer.removeListener('notification', listener);
        },
    },

    // Nudges
    nudges: {
        getActive: (): Promise<Nudge | null> => ipcRenderer.invoke(IPC_CHANNELS.NUDGE_GET),
        dismiss: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NUDGE_DISMISS, id),
    },

    // Events / Window Control
    events: {
        closeQuickEntry: (showMain?: boolean) => ipcRenderer.send(IPC_CHANNELS.QUICK_ENTRY_CLOSE, showMain),
        onRefreshTasks: (callback: () => void) => {
            const listener = () => callback();
            ipcRenderer.on('task:refresh', listener);
            return () => ipcRenderer.removeListener('task:refresh', listener);
        },
    },

    // Focus Queue
    focusQueue: {
        get: (): Promise<FocusQueue | null> => ipcRenderer.invoke(IPC_CHANNELS.FOCUS_QUEUE_GET),
        onUpdated: (callback: (queue: FocusQueue) => void) => {
            const listener = (_event: IpcRendererEvent, queue: FocusQueue) => callback(queue);
            ipcRenderer.on('focus-queue:updated', listener);
            return () => ipcRenderer.removeListener('focus-queue:updated', listener);
        },
    },
});


// Type declaration for the exposed API
export type DriftAPI = {
    tasks: {
        getAll: () => Promise<Task[]>;
        create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
        update: (id: string, updates: Partial<Task>) => Promise<Task | null>;
        delete: (id: string) => Promise<boolean>;
        planDay: () => Promise<{ focusedTaskIds: string[], reasoning: string }>;
    };
    ai: {
        analyze: (content: string) => Promise<ExtendedTaskAnalysis>;
        processCommand: (command: string, activeTasks: { id: string, content: string }[]) => Promise<{ taskId: string | null; updates: any; confirmation: string }>;
    };
    settings: {
        get: () => Promise<Settings>;
        update: (updates: Partial<Settings>) => Promise<Settings>;
    };
    notifications: {
        onNotification: (callback: (payload: NotificationPayload) => void) => () => void;
    };
    nudges: {
        getActive: () => Promise<Nudge | null>;
        dismiss: (id: string) => Promise<boolean>;
    };
    events: {
        closeQuickEntry: (showMain?: boolean) => void;
        onRefreshTasks: (callback: () => void) => () => void;
    };
    focusQueue: {
        get: () => Promise<FocusQueue | null>;
        onUpdated: (callback: (queue: FocusQueue) => void) => () => void;
    };
};

declare global {
    interface Window {
        drift: DriftAPI;
    }
}

