# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Drift** is an AI-powered personal task manager built with Electron, designed with gentle accountability features to support productivity without being overwhelming. The app uses Claude AI (via Anthropic API) to intelligently analyze tasks, generate daily plans, and provide supportive check-ins.

## Key Commands

### Development
```bash
npm start                 # Start the app in development mode
npm run lint             # Run ESLint
```

### Building & Packaging
```bash
npm run package          # Package the app for distribution
npm run make             # Create distributable installers
```

### Database
```bash
npm run db:generate      # Generate Drizzle migration files
npm run db:push          # Push schema changes to database
```

Note: This project uses inline migrations in `src/main/db/index.ts` rather than separate migration files. The `db:generate` and `db:push` commands are available but migrations are currently applied via `createTables()` on app startup.

## Architecture

### Electron Process Model

This is a standard Electron app with three key processes:

1. **Main Process** (`src/main.ts`): Manages app lifecycle, windows, database, IPC handlers, and background services
2. **Preload Script** (`src/preload.ts`): Exposes safe IPC methods to renderer via `window.drift` API
3. **Renderer Process** (`src/renderer.tsx`, `src/App.tsx`): React-based UI

### Two Window Architecture

- **Main Window**: Full task manager interface with dashboard, task list, and settings
- **Quick Entry Window**: Lightweight overlay (triggered by `Cmd/Ctrl+Shift+Space`) for rapid task capture. Appears as a transparent, frameless window that hides on blur.

### Core Services (Main Process)

Located in `src/main/`:

- **ai-service.ts**: Handles all AI interactions via Vercel AI SDK + Anthropic
  - `analyzeTask()`: Extracts category, priority, dates, recurrence from natural language
  - `generateNudge()`: Creates supportive check-in messages based on task state
  - `generateDailyPlan()`: AI-powered task prioritization (3-5 tasks for the day)
  - `processAtMention()`: Parses @ commands for task updates (e.g., "@move to Friday 5pm")

- **notification-service.ts**: Manages scheduled notifications via `node-schedule`
  - Morning check-in (default 9:00 AM)
  - Midday check-in (default 1:00 PM)
  - Overdue task alerts (every hour at :30)
  - Due-time notifications (checks every minute)

- **focus-queue-service.ts**: Manages the daily "Plan My Day" feature
  - Caches AI-generated daily plan to database (via `focusDate` and `focusOrder` fields)
  - Regenerates automatically at morning/midday check-ins
  - Prevents redundant AI calls for the same day

### Database

- **ORM**: Drizzle ORM with better-sqlite3
- **Schema**: Defined in `src/main/db/schema.ts`
- **Location**: User data directory (`drift.db` in app's userData folder)
- **Tables**:
  - `tasks`: Full task data including recurrence, focus queue, and AI metadata
  - `settings`: Single-row table for app configuration
  - `nudges`: AI-generated check-in messages and reminders

Database initialization uses inline migrations in `src/main/db/index.ts`. Each table is created with `CREATE TABLE IF NOT EXISTS`, and columns are added via `ALTER TABLE` with try/catch to handle existing columns.

### State Management

- **Zustand** store at `src/stores/taskStore.ts`
- Manages tasks, filters, settings, nudges, and focus queue
- All IPC calls to main process go through this store

### IPC Communication

All IPC channels are defined in `src/lib/types.ts` via the `IPC_CHANNELS` constant. The preload script exposes a type-safe API at `window.drift` with namespaces:
- `tasks.*` - CRUD operations
- `ai.*` - Analysis and command processing
- `settings.*` - User preferences
- `nudges.*` - Check-in messages
- `focusQueue.*` - Daily plan
- `events.*` - Window control and refresh events

### AI Integration

The app uses Claude AI (Anthropic) via the Vercel AI SDK. Key behaviors:

- **Model**: `claude-haiku-4-5-20251001` for all operations (fast, cost-effective)
- **Fallback**: If AI is not configured (no API key), uses rule-based analysis
- **Task Analysis**: Extracts structured data from natural language using `generateObject()` with Zod schemas
- **Natural Language Processing**:
  - Dates: "tomorrow", "next Friday", "in 2 weeks"
  - Times: "at 5pm", "9:30am", "18:00"
  - Recurrence: "every day", "weekly on Mon/Wed/Fri", "every 2 weeks"
  - Categories: Auto-detected from keywords
  - Priority: Based on urgency words (urgent, asap, soon, etc.)

#### AI-Managed Task Attributes

**CRITICAL**: The AI service manages nearly all task attributes. When adding new task fields, you MUST update the AI service to handle them. See `.agent/workflows/ai-task-attributes.md` for the complete workflow.

Current AI-managed attributes:
- `content` — Task title/description (cleaned of scheduling info)
- `category` — Work, personal, health, finance, shopping, communication, learning, home, errands, other
- `priority` — low, medium, high (based on urgency words)
- `dueDate` — Specific date parsed from natural language
- `dueTime` — Specific time in HH:mm 24-hour format
- `recurrence` — none, daily, weekly, monthly
- `recurrenceInterval` — Every N periods (e.g., 2 = every 2 weeks)
- `recurrenceDays` — For weekly: comma-separated day numbers (0=Sunday, 6=Saturday)
- `notes` — Additional context (appended via @ commands)

**When adding new task fields:**
1. Update database schema (`src/main/db/schema.ts`)
2. Update `Task` type (`src/lib/types.ts`)
3. Add migration in `src/main/db/index.ts` (`createTables()` function)
4. Update `rowToTask()` helper in `src/main.ts`
5. Handle in IPC handlers (`TASK_CREATE`, `TASK_UPDATE`)
6. **UPDATE AI SERVICE (`src/main/ai-service.ts`)**:
   - Add field to `taskAnalysisSchema` (for `analyzeTask()`)
   - Add field to `taskUpdateSchema` (for `processAtMention()`)
   - Update system prompts to explain the new field
7. Update Zustand store defaults if needed (`src/stores/taskStore.ts`)
8. Add UI controls if needed

### Task Recurrence System

Tasks support flexible recurrence patterns:
- `recurrence`: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
- `recurrenceInterval`: Repeat every N periods (e.g., 2 = every 2 weeks)
- `recurrenceDays`: For weekly recurrence, comma-separated day numbers (0=Sunday, 6=Saturday)
- `recurrenceEndDate`: Optional end date for the series
- `seriesId`: Links all instances of a recurring task together

The AI can extract recurrence from natural language (e.g., "call mom every Friday at 6pm" → `recurrence: 'weekly'`, `recurrenceDays: '5'`, `dueTime: '18:00'`).

### Date Handling

**CRITICAL**: The app treats YYYY-MM-DD strings as local midnight, not UTC. Helper function `parseIPCDate()` in `src/main.ts:172` ensures dates like "2024-12-21" are interpreted as local 00:00:00, preventing timezone conversion issues (e.g., "Dec 21" UTC becoming "Dec 20 6pm" CST).

## Component Structure

Key React components in `src/components/`:

- **Dashboard.tsx**: Shows focus queue, today's stats, and "Plan My Day" button
- **TaskList.tsx**: Renders filtered tasks with AnimatePresence for smooth animations
- **TaskCard.tsx**: Individual task with expand/collapse, edit, complete, delete actions
- **TaskInput.tsx**: Smart input with AI analysis and @ command support
- **FilterBar.tsx**: Toggle between Today / Upcoming / All / Completed views
- **Nudge.tsx**: Displays AI-generated check-in messages
- **SettingsModal.tsx**: Configuration for API key, theme, notification times
- **QuickEntryApp.tsx**: Minimal UI for quick entry window

## Packaging & Distribution

Uses Electron Forge with Vite plugin:

- **Config**: `forge.config.ts`
- **Vite Configs**: Separate configs for main (`vite.main.config.ts`), preload (`vite.preload.config.ts`), and renderer (`vite.renderer.config.ts`)
- **Native Modules**: better-sqlite3 is explicitly included and unpacked (see `packagerConfig.ignore` in forge.config.ts)
- **Makers**: Configured for Squirrel (Windows), ZIP (macOS), DEB, and RPM

## Styling

- Warm, calm color palette (browns, tans, soft oranges)
- Framer Motion for all animations
- CSS in `src/App.css` and `src/index.css`
- Dark theme by default (light theme available)

## Common Patterns

### Adding a New Task Field (Complete Workflow)

1. Update `Task` interface in `src/lib/types.ts`
2. Update schema in `src/main/db/schema.ts`
3. Add migration in `src/main/db/index.ts` (`createTables()` function)
4. Update `rowToTask()` helper in `src/main.ts`
5. Handle in IPC handlers (`TASK_CREATE`, `TASK_UPDATE`)
6. **Update AI service** (`src/main/ai-service.ts`):
   - Add to `taskAnalysisSchema` Zod schema (for task creation)
   - Add to `taskUpdateSchema` Zod schema (for @ mention updates)
   - Update prompts to explain how to extract/set the field
7. Update Zustand store if needed (`src/stores/taskStore.ts`)
8. Add UI controls in React components

### Adding a New IPC Channel

1. Define channel name in `IPC_CHANNELS` (`src/lib/types.ts`)
2. Add handler in `src/main.ts` using `ipcMain.handle()` or `ipcMain.on()`
3. Expose in preload script (`src/preload.ts`) via `contextBridge.exposeInMainWorld()`
4. Add to `DriftAPI` type in preload script
5. Call from Zustand store or React component via `window.drift.*`

## Important Notes

- API keys are stored in the database, not environment variables
- The app requires an Anthropic API key to enable AI features
- Database migrations are inline (not managed by Drizzle Kit)
- Quick entry window is hidden, not destroyed, for performance
- Focus queue is cached daily to avoid redundant AI calls
- All times stored in HH:mm 24-hour format
- **AI integration is central to the app's UX** — always expose new task fields to the AI service
