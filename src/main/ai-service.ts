import { generateText, generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { TaskAnalysis, Priority, RecurrenceType } from '../lib/types';

// AI service for task analysis and nudge generation
// Uses Vercel AI SDK with Anthropic (Claude) as default provider

let anthropicClient: ReturnType<typeof createAnthropic> | null = null;

export function initializeAI(apiKey: string) {
    anthropicClient = createAnthropic({
        apiKey,
    });
}

export function isAIConfigured(): boolean {
    return anthropicClient !== null;
}

// Extended task analysis response including all attributes
export interface ExtendedTaskAnalysis extends TaskAnalysis {
    cleanedContent: string; // The task title without scheduling info
    dueTime: string | null; // HH:mm format
    recurrence: RecurrenceType;
    recurrenceInterval: number;
    recurrenceDays: string | null; // comma-separated day numbers for weekly
}

// Zod schema for comprehensive task analysis
const taskAnalysisSchema = z.object({
    cleanedContent: z.string().describe('The core task title without date/time/recurrence info. E.g., "call mom every Friday at 6pm" becomes "call mom"'),
    category: z.enum([
        'work', 'personal', 'shopping', 'health', 'home',
        'communication', 'finance', 'learning', 'errands', 'other'
    ]).nullable().describe('The category that best fits this task'),
    priority: z.enum(['low', 'medium', 'high']).describe('Task priority based on urgency'),
    suggestedDays: z.number().nullable().describe('Days from now for due date, or null if no specific date. 0=today, 1=tomorrow, etc.'),
    dueTime: z.string().nullable().describe('Specific time in HH:mm 24-hour format (e.g., "18:00" for 6pm), or null'),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).describe('How often the task repeats'),
    recurrenceInterval: z.number().describe('Repeat every N periods (e.g., 2 for "every 2 weeks"). Usually 1.'),
    recurrenceDays: z.string().nullable().describe('For weekly: comma-separated day numbers (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat). E.g., "1,3,5" for Mon/Wed/Fri'),
});

// Analyze a task to extract all attributes from natural language
export async function analyzeTask(content: string): Promise<ExtendedTaskAnalysis> {
    if (!anthropicClient) {
        return fallbackAnalysis(content);
    }

    try {
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

        const { object } = await generateObject({
            model: anthropicClient('claude-haiku-4-5-20251001'),
            schema: taskAnalysisSchema,
            prompt: `Analyze this task and extract ALL scheduling information: "${content}"

Today is ${dayOfWeek}, ${today.toLocaleDateString()}.

Extract:
1. cleanedContent: The core task (remove dates, times, recurrence words)
2. category: Best fit from the categories
3. priority: Based on urgency words
4. suggestedDays: Number of days until due (0=today, null if no date)
5. dueTime: Specific time in HH:mm format (use 24-hour, e.g., 18:00 for 6pm)
6. recurrence: none/daily/weekly/monthly based on keywords like "every day", "weekly", etc.
7. recurrenceInterval: The number (e.g., "every 2 weeks" = 2)
8. recurrenceDays: For weekly, which days (0=Sun...6=Sat). "Friday" = "5", "Mon Wed Fri" = "1,3,5"

Examples:
- "call mom every Friday at 6pm" → cleanedContent: "call mom", recurrence: "weekly", recurrenceDays: "5", dueTime: "18:00"
- "daily standup at 9am" → cleanedContent: "daily standup", recurrence: "daily", dueTime: "09:00"
- "buy groceries tomorrow" → cleanedContent: "buy groceries", suggestedDays: 1, recurrence: "none"`,
        });

        // Calculate dueDate from suggestedDays
        let suggestedDueDate: Date | null = null;
        if (object.suggestedDays !== null) {
            suggestedDueDate = new Date(Date.now() + object.suggestedDays * 24 * 60 * 60 * 1000);
        } else if (object.recurrence === 'weekly' && object.recurrenceDays) {
            // For weekly recurring, set first occurrence to next matching day
            const days = object.recurrenceDays.split(',').map(Number);
            const todayDay = today.getDay();
            let nextDay = days.find(d => d > todayDay);
            if (nextDay === undefined) nextDay = days[0];
            const daysUntil = nextDay > todayDay ? nextDay - todayDay : 7 - todayDay + nextDay;
            suggestedDueDate = new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000);
        }

        return {
            cleanedContent: object.cleanedContent || content,
            category: object.category,
            priority: (object.priority as Priority) || 'low',
            suggestedDueDate,
            dueTime: object.dueTime,
            recurrence: object.recurrence as RecurrenceType,
            recurrenceInterval: object.recurrenceInterval || 1,
            recurrenceDays: object.recurrenceDays,
        };
    } catch (error) {
        console.error('AI analysis failed:', error);
        return fallbackAnalysis(content);
    }
}

// Generate a friendly nudge message based on task state
export async function generateNudge(
    tasks: { content: string; priority: Priority | null; isOverdue: boolean }[],
    timeOfDay: 'morning' | 'midday' | 'evening'
): Promise<string> {
    if (!anthropicClient) {
        return getDefaultNudge(tasks.length, timeOfDay);
    }

    try {
        const overdueTasks = tasks.filter(t => t.isOverdue);
        const highPriorityTasks = tasks.filter(t => t.priority === 'high');

        const { text } = await generateText({
            model: anthropicClient('claude-haiku-4-5-20251001'),
            system: `You are a friendly, encouraging task assistant. Generate a brief, warm check-in message (1-2 sentences max).
          
Tone: Supportive friend, not parental or aggressive. Encouraging but not pushy.
Time: ${timeOfDay}
Keep it natural and conversational. No emojis at the start.`,
            prompt: `User has ${tasks.length} pending tasks. ${overdueTasks.length} are overdue. ${highPriorityTasks.length} are high priority. Generate a friendly ${timeOfDay} check-in.`
        });

        return text.trim();
    } catch (error) {
        console.error('Nudge generation failed:', error);
        return getDefaultNudge(tasks.length, timeOfDay);
    }
}

// Fallback rule-based analysis when AI is not available
function fallbackAnalysis(content: string): ExtendedTaskAnalysis {
    const lower = content.toLowerCase();

    // Category detection
    let category: string | null = null;
    if (lower.includes('work') || lower.includes('meeting') || lower.includes('email') || lower.includes('report')) {
        category = 'work';
    } else if (lower.includes('buy') || lower.includes('shop') || lower.includes('groceries') || lower.includes('order')) {
        category = 'shopping';
    } else if (lower.includes('call') || lower.includes('text') || lower.includes('message') || lower.includes('email')) {
        category = 'communication';
    } else if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('health') || lower.includes('gym')) {
        category = 'health';
    } else if (lower.includes('home') || lower.includes('clean') || lower.includes('fix') || lower.includes('repair')) {
        category = 'home';
    } else if (lower.includes('pay') || lower.includes('bill') || lower.includes('bank') || lower.includes('budget')) {
        category = 'finance';
    } else if (lower.includes('learn') || lower.includes('study') || lower.includes('read') || lower.includes('course')) {
        category = 'learning';
    }

    // Priority detection
    let priority: Priority = 'low';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('important') || lower.includes('critical')) {
        priority = 'high';
    } else if (lower.includes('soon') || lower.includes('this week') || lower.includes('tomorrow')) {
        priority = 'medium';
    }

    // Due date suggestion
    let suggestedDueDate: Date | null = null;
    let dueTime: string | null = null;

    if (lower.includes('today')) {
        suggestedDueDate = new Date();
    } else if (lower.includes('tomorrow')) {
        suggestedDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (lower.includes('this week')) {
        suggestedDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // Time detection (simple regex for basic times like "9am", "5pm", "18:00")
    // This is very basic fallback logic compared to the LLM
    const timeMatch = lower.match(/(\d{1,2})(:(\d{2}))?\s*(am|pm)|(\d{1,2}):(\d{2})/);
    if (timeMatch) {
        // This is a naive implementation for fallback, real power comes from LLM
        dueTime = "09:00"; // Placeholder default if time detected without parsing
    }

    return {
        cleanedContent: content, // Simple fallback: cleaned matches original
        category,
        priority,
        suggestedDueDate,
        dueTime,
        recurrence: 'none',
        recurrenceInterval: 1,
        recurrenceDays: null
    };
}

// Zod schema for task updates via @mention
const taskUpdateSchema = z.object({
    taskId: z.string().nullable().describe('The ID of the task to update, or null if no matching task found'),
    updates: z.object({
        content: z.string().optional(),
        category: z.enum([
            'work', 'personal', 'shopping', 'health', 'home',
            'communication', 'finance', 'learning', 'errands', 'other'
        ]).optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        dueTime: z.string().nullable().optional(),
        dueDate: z.string().optional().describe('ISO date string (YYYY-MM-DD)'),
        recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
        recurrenceInterval: z.number().optional(),
        recurrenceDays: z.string().nullable().optional(),
        notes: z.string().optional().describe('Text to append to notes'),
    }).describe('The fields to update on the task'),
});

// Process an @mention command to update a task
export async function processAtMention(
    command: string,
    activeTasks: { id: string; content: string }[]
): Promise<{ taskId: string | null; updates: any; confirmation: string }> {
    if (!anthropicClient) {
        return { taskId: null, updates: {}, confirmation: "AI not configured." };
    }

    try {
        const today = new Date();
        const start = command.indexOf('@') + 1;
        const cleanCommand = start > 0 ? command.slice(start) : command;

        const { object } = await generateObject({
            model: anthropicClient('claude-haiku-4-5-20251001'),
            schema: taskUpdateSchema,
            prompt: `Interpret this task update command: "@${cleanCommand}"

Context:
- Today is ${today.toLocaleDateString()} (${today.toLocaleDateString('en-US', { weekday: 'long' })})
- User is mentioning a task to update it.

Available Active Tasks (ID: Content):
${activeTasks.map(t => `${t.id}: ${t.content}`).join('\n')}

Instructions:
1. Identify which task is being referenced (fuzzy match). If vague, pick the best fit.
2. Extract the updates requested (e.g., "change time to 5pm" -> dueTime: "17:00").
3. If "dueDate" is implied (e.g., "move to Friday"), return ISO date string.
4. If "notes" are added, return the text to append.

Return null taskId if absolutely no task matches.`,
        });

        // Generate a confirmation message
        let confirmation = "Task updated.";
        if (object.taskId) {
            const task = activeTasks.find(t => t.id === object.taskId);
            const taskName = task ? `"${task.content}"` : "Task";
            const updateCount = Object.keys(object.updates).length;
            confirmation = `Updated ${taskName} with ${updateCount} change${updateCount !== 1 ? 's' : ''}.`;
        } else {
            confirmation = "Could not find a matching task to update.";
        }

        return {
            taskId: object.taskId,
            updates: object.updates,
            confirmation
        };
    } catch (error) {
        console.error('AI @mention processing failed:', error);
        return { taskId: null, updates: {}, confirmation: "Failed to process command." };
    }
}

// Default nudge messages
function getDefaultNudge(taskCount: number, timeOfDay: 'morning' | 'midday' | 'evening'): string {
    if (taskCount === 0) {
        return "Your slate is clean! Time to tackle something new or just enjoy the breather.";
    }

    const greetings = {
        morning: "Ready to make today count?",
        midday: "How's the day going?",
        evening: "Wrapping up the day?"
    };

    return `${greetings[timeOfDay]} You've got ${taskCount} ${taskCount === 1 ? 'thing' : 'things'} on your list.`;
}

// Zod schema for daily planning
const dailyPlanSchema = z.object({
    focusedTaskIds: z.array(z.string()).describe('The IDs of the tasks selected for today, in order of execution'),
    reasoning: z.string().describe('A brief, encouraging explanation of why this plan was chosen (e.g., "Tackling the overdue report first, then some quick emails to build momentum.")'),
    estimatedTotalMinutes: z.number().describe('Total estimated minutes for these tasks'),
});

export async function generateDailyPlan(tasks: any[]): Promise<{ focusedTaskIds: string[], reasoning: string }> {
    if (!anthropicClient) {
        // Fallback: simple sort
        return {
            focusedTaskIds: tasks
                .sort((a, b) => (new Date(a.dueDate || 0).getTime()) - (new Date(b.dueDate || 0).getTime()))
                .slice(0, 5)
                .map(t => t.id),
            reasoning: "AI not configured. Showing closest due dates."
        };
    }

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Filter potential candidates (ignore far future)
    const candidates = tasks.filter(t => t.status === 'active');

    // Create a simplified representation to save tokens
    const simplifiedTasks = candidates.map(t => ({
        id: t.id,
        content: t.content,
        priority: t.priority,
        dueDate: t.dueDate,
        category: t.category
    }));

    try {
        const { object } = await generateObject({
            model: anthropicClient('claude-haiku-4-5-20251001'),
            schema: dailyPlanSchema,
            prompt: `You are an expert productivity coach for someone with ADHD. 
            
Today is ${dayOfWeek}, ${today.toLocaleDateString()}.

Here is the user's active task list:
${JSON.stringify(simplifiedTasks, null, 2)}

GOAL: Create a realistic, motivating plan for today.
1. Prioritize OVERDUE and TODAY tasks.
2. If the list is huge, pick only 3-5 "Must Do" items to prevent overwhelm.
3. Mix "Quick Wins" (easy) with "Deep Work" (hard).
4. Order them logically (e.g. Eat the Frog: hardest first, or Snowball: easiest first).

Select the IDs of the tasks to focus on today.`,
        });

        return {
            focusedTaskIds: object.focusedTaskIds,
            reasoning: object.reasoning
        };
    } catch (error) {
        console.error("AI Planning failed:", error);
        return {
            focusedTaskIds: candidates.slice(0, 5).map(t => t.id),
            reasoning: "AI planning failed. Showing top items."
        };
    }
}

export { fallbackAnalysis };
