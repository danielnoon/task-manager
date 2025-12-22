import { useEffect, RefObject } from 'react';

/**
 * Hook to auto-focus an input element on mount and window focus.
 * Extracted from TaskInput.tsx for reusability.
 *
 * @param ref - React ref to the input element to focus
 * @param enabled - Whether auto-focus is enabled (default: true)
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useAutoFocus(inputRef);
 *
 * return <input ref={inputRef} />;
 * ```
 */
export function useAutoFocus<T extends HTMLElement = HTMLInputElement>(
  ref: RefObject<T>,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const focusElement = () => {
      // Small timeout prevents fighting with other focus events
      setTimeout(() => {
        ref.current?.focus();
      }, 10);
    };

    focusElement();
    window.addEventListener('focus', focusElement);

    return () => window.removeEventListener('focus', focusElement);
  }, [ref, enabled]);
}
