/**
 * Re-export recurrence utilities from stores/utils/recurrence.ts
 * This provides a cleaner import path for components.
 *
 * The actual implementation remains in stores/utils/recurrence.ts
 * where it's used by the task store.
 */

export { calculateNextDueDate } from '../stores/utils/recurrence';
