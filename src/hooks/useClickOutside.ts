import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks outside of a specified element.
 * Useful for closing modals, dropdowns, and date pickers.
 *
 * Extracted from TaskCard.tsx and reusable across components.
 *
 * @param ref - React ref to the element to detect clicks outside of
 * @param handler - Callback function to execute when click outside is detected
 * @param enabled - Whether the hook is enabled (default: true)
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * useClickOutside(dropdownRef, () => setIsOpen(false));
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}
