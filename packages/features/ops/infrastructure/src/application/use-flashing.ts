import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Presentation-only flash kind. Maps to `entity-flash-*` CSS classes.
 * Decoupled from `NodeDisplayState` so the bulk-action bar can flash a
 * narrower vocabulary (state-change events) than the badge composite.
 */
export type FlashKind = 'running' | 'draining' | 'stopped' | 'error';

export function useFlashing() {
  const [flashingNodes, setFlashingNodes] = useState<Map<string, FlashKind>>(
    new Map(),
  );

  const flashTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timeouts = flashTimeouts.current;
    return () => {
      for (const t of timeouts) clearTimeout(t);
      timeouts.clear();
    };
  }, []);

  const flashNodes = useCallback((ids: string[], status: FlashKind) => {
    setFlashingNodes((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, status);
      return next;
    });
    const timeoutId = setTimeout(() => {
      flashTimeouts.current.delete(timeoutId);
      setFlashingNodes((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, 1400);
    flashTimeouts.current.add(timeoutId);
  }, []);

  const flashClassFor = useCallback(
    (id: string): string | undefined => {
      const s = flashingNodes.get(id);
      return s ? `entity-flash-${s}` : undefined;
    },
    [flashingNodes],
  );

  return {
    flashingNodes,
    flashNodes,
    flashClassFor,
  } as const;
}

