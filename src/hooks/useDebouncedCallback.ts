import { useCallback, useRef, useEffect } from 'react';

/**
 * Debounced callback type with extra control methods.
 * Backwards compatible: still callable like a normal function.
 */
export type DebouncedCallback<T extends (...args: any[]) => any> = T & {
  cancel: () => void;
  flush: () => void;
};

/**
 * Hook that returns a debounced version of the callback.
 * The callback will only be executed after the specified delay
 * has passed since the last invocation.
 *
 * The returned function exposes `.cancel()` to cancel a pending call
 * and `.flush()` to immediately invoke a pending call.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedCallback<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    lastArgsRef.current = args;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const a = lastArgsRef.current;
      lastArgsRef.current = null;
      if (a) callbackRef.current(...a);
    }, delay);
  }, [delay]) as DebouncedCallback<T>;

  // Attach control methods (mutates the same function reference each render —
  // safe because the function identity is stable thanks to useCallback).
  debounced.cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  debounced.flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const a = lastArgsRef.current;
    lastArgsRef.current = null;
    if (a) callbackRef.current(...a);
  }, []);

  return debounced;
}
