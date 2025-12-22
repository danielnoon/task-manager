import { addDays, addWeeks, addMonths, getDay } from 'date-fns';
import { RecurrenceType } from '../../lib/types';

/**
 * Calculate the next due date for a recurring task.
 *
 * @param currentDueDate - The current due date
 * @param recurrence - The recurrence type (daily, weekly, monthly, custom)
 * @param interval - The interval (e.g., every 2 weeks)
 * @param recurrenceDays - For weekly recurrence, comma-separated day numbers (0=Sunday, 6=Saturday)
 * @returns The next due date
 */
export function calculateNextDueDate(
  currentDueDate: Date,
  recurrence: RecurrenceType,
  interval: number,
  recurrenceDays: string | null
): Date {
  const current = new Date(currentDueDate);

  switch (recurrence) {
    case 'daily':
      return addDays(current, interval);

    case 'weekly':
      if (recurrenceDays) {
        // Find the next matching day
        const days = recurrenceDays.split(',').map(Number);
        const currentDay = getDay(current);
        const sortedDays = [...days].sort((a, b) => a - b);

        // Find next day in the same week or next week
        let nextDay = sortedDays.find(d => d > currentDay);
        if (nextDay !== undefined) {
          return addDays(current, nextDay - currentDay);
        } else {
          // Wrap to first day of next week cycle
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
          return addDays(current, daysUntilNextWeek + (interval - 1) * 7);
        }
      }
      return addWeeks(current, interval);

    case 'monthly':
      return addMonths(current, interval);

    case 'custom':
      // For now, custom behaves like daily with variable interval
      return addDays(current, interval);

    default:
      return current;
  }
}
