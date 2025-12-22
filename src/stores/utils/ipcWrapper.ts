/**
 * Utility wrapper for IPC calls with standardized error handling and loading states.
 * Extracts the repeated try/catch/finally pattern used throughout the store.
 */

type SetFunction = (partial: object) => void;

/**
 * Wraps an IPC call with loading state management and error handling.
 *
 * @param fn - The async function to execute (IPC call)
 * @param set - Zustand's set function
 * @param loadingKey - Optional key to track loading state (e.g., 'isLoading', 'isAnalyzing')
 * @returns The result of the async function
 * @throws Re-throws any errors after logging them
 */
export async function withIPC<T>(
  fn: () => Promise<T>,
  set: SetFunction,
  loadingKey?: string
): Promise<T> {
  if (loadingKey) {
    set({ [loadingKey]: true });
  }

  try {
    return await fn();
  } catch (error) {
    console.error('IPC Error:', error);
    throw error;
  } finally {
    if (loadingKey) {
      set({ [loadingKey]: false });
    }
  }
}
