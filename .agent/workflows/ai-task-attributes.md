---
description: Ensure AI can set/modify all task attributes
---

# AI Task Attribute Management

When adding new fields to tasks, **always expose them to the AI** for both:
1. **Task creation** — AI should parse natural language and set initial values
2. **@ mention updates** — AI should parse "@taskname do X" and update attributes

## Current AI-Managed Attributes

The AI service (`src/main/ai-service.ts`) should handle:

- `content` — The task title/description
- `category` — Work, personal, health, finance, etc.
- `priority` — low, medium, high
- `dueDate` — Specific date
- `dueTime` — Specific time in HH:mm format
- `recurrence` — none, daily, weekly, monthly
- `recurrenceInterval` — Every N days/weeks/months
- `recurrenceDays` — For weekly: comma-separated days (0=Sun, 1=Mon, etc.)
- `notes` — Additional context

## Adding New Fields

When adding a new task field:

1. Add to database schema (`src/main/db/schema.ts`)
2. Add to Task type (`src/lib/types.ts`)
3. Add migration in `src/main/db/index.ts`
4. Update `rowToTask` helper in `src/main.ts`
5. Update TASK_CREATE and TASK_UPDATE IPC handlers in `src/main.ts`
6. Update store defaults in `src/stores/taskStore.ts`
7. **UPDATE AI SERVICE** — Add field to:
   - `analyzeTask()` response schema
   - `processAtMention()` response schema
   - System prompts explaining the field
8. Add UI controls if needed

## Example Prompts

**Creation:**
- "call mom every Friday at 6pm" → content: "call mom", recurrence: weekly, recurrenceDays: "5", dueTime: "18:00"
- "finish report tomorrow morning high priority" → content: "finish report", dueDate: tomorrow, dueTime: "09:00", priority: high

**@ Mention Updates:**
- "@call mom change time to 5pm" → updates dueTime to "17:00"
- "@finish report mark as daily" → updates recurrence to "daily"
- "@meeting add note: bring slides" → appends to notes
