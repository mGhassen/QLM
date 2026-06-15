import { useCallback, useEffect, useState } from 'react';

/**
 * localStorage-backed state with SSR safety and cross-tab sync.
 *
 * Intended for table preferences (filters, sort, visible columns). Keys
 * should be namespaced like `guepard:<feature>:<setting>` to avoid
 * collisions across apps.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [value, setValue] = useState<T>(readValue);

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(resolved));
          }
        } catch {
          // ignore quota / serialization errors
        }
        return resolved;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    setValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setValue(
          event.newValue ? (JSON.parse(event.newValue) as T) : initialValue,
        );
      } catch {
        // ignore malformed payloads from other tabs
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [value, setStoredValue, reset];
}
