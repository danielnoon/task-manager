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

The app uses Zustand with a slice-based architecture for maintainability:

- **Main Store** (`src/stores/taskStore.ts`): Composes all slices into a single store interface
- **Slices** (`src/stores/slices/`): Domain-specific state and actions
  - `tasksSlice.ts`: Task CRUD operations, AI analysis integration
  - `filtersSlice.ts`: View filtering (today/upcoming/all/completed) and category filtering
  - `settingsSlice.ts`: User preferences, API key management
  - `nudgesSlice.ts`: AI check-in messages and dismissal
  - `focusSlice.ts`: Daily planning and focus queue management
- **Utilities** (`src/stores/utils/`): Reusable helpers
  - `ipcWrapper.ts`: Standardized IPC error handling with loading states
  - `recurrence.ts`: Recurrence calculation logic
- **Selectors** (`src/stores/selectors/`): Memoized computed values
  - `taskSelectors.ts`: Filtered tasks, counts, categories

**Key Patterns:**

```typescript
// Discriminated union for addTask results (replaces magic error throws)
type AddTaskResult =
  | { type: 'task_created'; task: Task }
  | { type: 'command_executed'; message: string; updatedTaskId?: string };

// Usage in components
const result = await addTask(input);
if (result.type === 'task_created') {
  // Handle new task
} else {
  // Handle command execution
}
```

All IPC calls to main process go through the store slices, wrapped with `withIPC()` for consistent error handling and loading states.

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

### Feature Components

Key React components in `src/components/`:

- **Dashboard.tsx**: Shows focus queue, today's stats, and "Plan My Day" button
- **TaskList.tsx**: Renders filtered tasks with AnimatePresence for smooth animations
- **TaskCard.tsx**: Individual task with expand/collapse, edit, complete, delete actions
- **TaskInput.tsx**: Smart input with AI analysis and @ command support
- **FilterBar.tsx**: Toggle between Today / Upcoming / All / Completed views
- **Nudge.tsx**: Displays AI-generated check-in messages
- **SettingsModal.tsx**: Configuration for API key, theme, notification times
- **QuickEntryApp.tsx**: Minimal UI for quick entry window

### UI Component Library

Reusable UI primitives in `src/components/ui/`:

**Button** (`Button.tsx`):
- Variants: `primary`, `secondary`, `ghost`, `text`, `danger`
- Sizes: `sm`, `md`, `lg`
- Props: `variant`, `size`, `icon`, `disabled`, `onClick`

```tsx
import Button from '@/components/ui/Button';
<Button variant="primary" size="md" onClick={handleSave}>Save Task</Button>
```

**Input** (`Input.tsx`):
- Variants: `default`, `large`, `command`
- Props: `variant`, `placeholder`, `value`, `onChange`, `autoFocus`

```tsx
import Input from '@/components/ui/Input';
<Input variant="large" placeholder="Add a task..." value={input} onChange={setInput} />
```

**Card** (`Card.tsx`):
- Variants: `default`, `interactive`, `elevated`
- Props: `variant`, `hover`, `border`, `padding`, `children`

```tsx
import Card from '@/components/ui/Card';
<Card variant="interactive" hover>{content}</Card>
```

**Badge** (`Badge.tsx`):
- Variants: `default`, `accent`, `success`, `error`, `warning`
- Props: `variant`, `size`, `children`

```tsx
import Badge from '@/components/ui/Badge';
<Badge variant="accent">{category}</Badge>
```

**Modal** (`Modal.tsx`):
- Parts: Overlay, header, body, footer
- Props: `isOpen`, `onClose`, `title`, `footer`, `children`
- Features: ESC key handler, click-outside to close, Framer Motion animations

```tsx
import Modal from '@/components/ui/Modal';
<Modal isOpen={isOpen} onClose={handleClose} title="Settings">
  {content}
</Modal>
```

**Toggle** (`Toggle.tsx`):
- Checkbox with label and optional description
- Props: `checked`, `onChange`, `label`, `description`, `disabled`

```tsx
import Toggle from '@/components/ui/Toggle';
<Toggle checked={enabled} onChange={setEnabled} label="Enable notifications" />
```

**Dropdown** (`Dropdown.tsx`):
- Smart positioning (automatically drops up/down based on space)
- Props: `isOpen`, `items`, `onSelect`, `position`, `triggerRef`

```tsx
import Dropdown from '@/components/ui/Dropdown';
<Dropdown isOpen={isOpen} items={items} onSelect={handleSelect} triggerRef={buttonRef} />
```

**ProgressRing** (`ProgressRing.tsx`):
- Circular SVG progress indicator
- Props: `value`, `max`, `size`, `strokeWidth`, `showLabel`, `color`

```tsx
import ProgressRing from '@/components/ui/ProgressRing';
<ProgressRing value={completed} max={total} size={120} showLabel />
```

### Shared Component Patterns

Reusable component patterns in `src/components/`:

**EmptyState** (`EmptyState.tsx`):
- Props: `icon`, `title`, `description`, `action`
- Used for empty task lists, empty focus queue, etc.

```tsx
import EmptyState from '@/components/EmptyState';
<EmptyState
  icon="📋"
  title="No tasks yet"
  description="Add your first task to get started"
  action={<Button onClick={handleAdd}>Add Task</Button>}
/>
```

**LoadingState** (`LoadingState.tsx`):
- Shimmer skeleton loader
- Props: `count`, `height`, `variant`

```tsx
import LoadingState from '@/components/LoadingState';
<LoadingState count={3} height={60} />
```

**DatePicker** (`DatePicker.tsx`):
- Full date picker with presets, custom date, time, and recurrence
- Props: `value`, `onChange`, `showTime`, `showRecurrence`
- Extracted from TaskCard for reusability

```tsx
import DatePicker from '@/components/DatePicker';
<DatePicker
  value={dueDate}
  onChange={handleDateChange}
  showTime
  showRecurrence
/>
```

## Packaging & Distribution

Uses Electron Forge with Vite plugin:

- **Config**: `forge.config.ts`
- **Vite Configs**: Separate configs for main (`vite.main.config.ts`), preload (`vite.preload.config.ts`), and renderer (`vite.renderer.config.ts`)
- **Native Modules**: better-sqlite3 is explicitly included and unpacked (see `packagerConfig.ignore` in forge.config.ts)
- **Makers**: Configured for Squirrel (Windows), ZIP (macOS), DEB, and RPM

## Styling

The app uses a modular, component-scoped CSS architecture:

### Design System Foundation

Located in `src/styles/`:

- **`tokens.css`**: CSS custom properties for design tokens
  - Colors (primary, accent, semantic colors for success/error/warning)
  - Typography (font sizes, weights, line heights)
  - Spacing scale (4px base, up to 64px)
  - Shadows and elevations
  - Border radii
  - Transition timings
  - Theme switching via `[data-theme="light"]` and `[data-theme="dark"]`

- **`reset.css`**: Base CSS reset
  - Box-sizing border-box
  - HTML/body defaults
  - Scrollbar styling

- **`animations.css`**: Global CSS animations
  - @keyframes definitions (fadeIn, slideUp, shimmer, pulse, glow, etc.)
  - Animation utility classes (`.animate-fade-in`, `.stagger-*`)

- **`utilities.css`**: Global utilities
  - Focus styles
  - Text selection colors
  - Scrollbar overrides

### Component-Scoped CSS

Each component has its own CSS file co-located with the component:

```
src/components/
├── Header.tsx / Header.css
├── TaskInput.tsx / TaskInput.css
├── TaskCard.tsx / TaskCard.css
└── ui/
    ├── Button.tsx / Button.css
    ├── Input.tsx / Input.css
    └── Modal.tsx / Modal.css
```

**Import Pattern:**

Components import their own CSS at the top of the file:

```tsx
// TaskCard.tsx
import './TaskCard.css';

export default function TaskCard() {
  // Component code
}
```

### Theme System

- **Dark theme by default** (warm browns, tans, soft oranges)
- **Light theme available** via settings
- Theme applied via `data-theme` attribute on root element
- Colors defined as CSS custom properties in `tokens.css`
- All components automatically adapt to theme via CSS variables

```css
/* Example from tokens.css */
:root {
  --color-bg: #1a1612;
  --color-text: #e8dcc8;
}

[data-theme='light'] {
  --color-bg: #faf8f5;
  --color-text: #2c2620;
}
```

### Global Styles

- **`src/index.css`**: Main entry point, imports all foundation styles
- **`src/App.css`**: App-level layout styles (~100 lines)

```css
/* index.css */
@import './styles/tokens.css';
@import './styles/reset.css';
@import './styles/animations.css';
@import './styles/utilities.css';
```

## Animation Patterns

Shared Framer Motion variants are centralized in `src/constants/animations.ts` for consistency across the app.

### Key Animation Variants

**Stagger Containers** (for lists and grids):

```tsx
import { staggerContainer, fadeInUp } from '@/constants/animations';
import { motion } from 'framer-motion';

<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={fadeInUp}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

**Available Variants:**

- **Container Variants** (parent elements):
  - `staggerContainer`: Standard stagger for lists (delay: 0.05s, stagger: 0.06s)
  - `staggerContainerFast`: Faster stagger for task lists (delay: 0.02s, stagger: 0.04s)
  - `staggerContainerUltraFast`: Ultra-fast for dashboard items

- **Item Variants** (child elements):
  - `fadeInUp`: Standard fade + slide up (y: 16px)
  - `fadeInUpSmall`: Smaller fade + slide up (y: 12px)
  - `fadeIn`: Simple fade with no movement
  - `fadeInScale`: Fade + slight scale for icons/empty states

- **Individual Elements**:
  - `slideUp`: Slide from bottom (headers, banners)
  - `slideInRight`: Slide from right (actions, buttons)
  - `iconBounceIn`: Bounce-in animation for icons
  - `collapseExpand`: Height-based transitions

- **Interaction Animations**:
  - `hoverScale`: Subtle scale on hover (1.05x)
  - `hoverScaleMedium`: Medium scale (1.1x)
  - `hoverScaleLarge`: Large scale for buttons (1.15x)

**Spring Transitions:**

```tsx
import { springTransition } from '@/constants/animations';

<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={springTransition}
>
  {content}
</motion.div>
```

Available: `springTransition`, `springTransitionSlow`, `springTransitionFast`

## Shared Utilities & Hooks

### Utilities (`src/utils/`)

**Date Utilities** (`date.ts`):

```tsx
import { isTaskDueToday, isTaskOverdue, countDueToday } from '@/utils/date';

// Check if task is due today
if (isTaskDueToday(task)) {
  // Show in Today view
}

// Check if task is overdue
if (isTaskOverdue(task)) {
  // Show overdue indicator
}

// Count tasks due today
const count = countDueToday(tasks);
```

Functions:
- `isTaskDueToday(task)`: Check if task is due today or has no due date
- `isTaskOverdue(task)`: Check if task is past due and not completed
- `getTasksForPeriod(tasks, period)`: Filter tasks by time period ('today' | 'upcoming' | 'week')
- `countCompletedToday(tasks)`: Count tasks completed today
- `countDueToday(tasks)`: Count tasks due today

**Recurrence Utilities** (`recurrence.ts`):

```tsx
import { calculateNextDueDate } from '@/utils/recurrence';

// Calculate next occurrence for recurring task
const nextDate = calculateNextDueDate(task);
```

### Hooks (`src/hooks/`)

**useClickOutside**:

```tsx
import { useClickOutside } from '@/hooks/useClickOutside';
import { useRef } from 'react';

const dropdownRef = useRef<HTMLDivElement>(null);

useClickOutside(dropdownRef, () => {
  setIsOpen(false);
}, enabled);

return <div ref={dropdownRef}>{content}</div>;
```

Props: `ref`, `handler`, `enabled` (optional, default: true)

**useAutoFocus**:

```tsx
import { useAutoFocus } from '@/hooks/useAutoFocus';

const inputRef = useAutoFocus<HTMLInputElement>();

return <input ref={inputRef} />;
```

Automatically focuses an input element on mount.

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
