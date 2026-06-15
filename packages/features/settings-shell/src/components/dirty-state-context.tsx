import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { SettingsSectionKey } from '../types/settings-section';

/**
 * Per-section dirty-state coordinator. Each section opts in by calling
 * `setDirty(myKey, true | false)` from its own form-state hook. The
 * dialog's close handler reads `isAnyDirty()` to decide whether to fire
 * the browser-native `confirm(...)` discard guard.
 */
type DirtyStateApi = {
  setDirty: (key: SettingsSectionKey, isDirty: boolean) => void;
  isAnyDirty: () => boolean;
};

const DirtyStateContext = createContext<DirtyStateApi | null>(null);

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  // Use a ref for the imperative read path (the dialog calls `isAnyDirty`
  // synchronously inside `onOpenChange`); back it with a state map so React
  // re-renders if any consumer wants to display "Unsaved changes" later.
  const dirtyMapRef = useRef<Map<SettingsSectionKey, boolean>>(new Map());
  const [, forceTick] = useState(0);

  const setDirty = useCallback((key: SettingsSectionKey, isDirty: boolean) => {
    const prev = dirtyMapRef.current.get(key) ?? false;
    if (prev === isDirty) return;
    if (isDirty) dirtyMapRef.current.set(key, true);
    else dirtyMapRef.current.delete(key);
    forceTick((tick) => tick + 1);
  }, []);

  const isAnyDirty = useCallback(() => dirtyMapRef.current.size > 0, []);

  const api = useMemo<DirtyStateApi>(
    () => ({ setDirty, isAnyDirty }),
    [setDirty, isAnyDirty],
  );

  return (
    <DirtyStateContext.Provider value={api}>
      {children}
    </DirtyStateContext.Provider>
  );
}

export function useSettingsDirtyState(): DirtyStateApi {
  const ctx = useContext(DirtyStateContext);
  if (!ctx) {
    throw new Error(
      'useSettingsDirtyState must be used within a <DirtyStateProvider>',
    );
  }
  return ctx;
}

/**
 * Optional hook for sections that want to mark themselves dirty without
 * threading their key through props. The component is responsible for
 * calling `markDirty(false)` when its form is reset / saved.
 */
export function useMarkSectionDirty(key: SettingsSectionKey) {
  const { setDirty } = useSettingsDirtyState();
  return useCallback(
    (isDirty: boolean) => setDirty(key, isDirty),
    [key, setDirty],
  );
}
