import { useEffect } from 'react';

import { useLocalStorage } from './use-local-storage';

type VersionedBlob<T> = {
  v: number;
  data: T;
};

function isVersionedBlob(value: unknown): value is VersionedBlob<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'v' in (value as Record<string, unknown>) &&
    'data' in (value as Record<string, unknown>) &&
    typeof (value as { v: unknown }).v === 'number'
  );
}

/**
 * Versioned localStorage preference store. Wraps `useLocalStorage` with:
 *  - an explicit schema version so old blobs can be migrated or reset
 *    when the shape changes, instead of silently feeding stale data
 *    into the UI;
 *  - an optional `scope` segment so per-project / per-user blobs don't
 *    collide (key becomes `${namespace}:${scope}:${key}`).
 *
 * The factory returns a hook with the same `[value, set, reset]` shape as
 * `useLocalStorage`, so call sites that already use `createPreferenceStore`
 * swap in with a one-line import change.
 *
 * Tolerates **legacy raw blobs** written by the non-versioned
 * `createPreferenceStore` — they're detected (no `v` / `data` keys) and
 * treated as v0, letting the caller's `migrate` run over the raw shape
 * or falling back to defaults.
 */
export function createVersionedPreferenceStore<
  Schema extends Record<string, unknown>,
>(
  namespace: string,
  defaults: Schema,
  options: {
    version: number;
    migrate?: (oldData: unknown, fromVersion: number) => Partial<Schema>;
  },
) {
  const { version, migrate } = options;

  return function useVersionedPreference<K extends keyof Schema & string>(
    key: K,
    scope?: string,
  ) {
    const fullKey = scope
      ? `${namespace}:${scope}:${key}`
      : `${namespace}:${key}`;
    const fallback: VersionedBlob<Schema[K]> = {
      v: version,
      data: defaults[key],
    };
    const [rawBlob, setBlob, reset] = useLocalStorage<unknown>(
      fullKey,
      fallback,
    );

    const { currentData, needsRewrite } = (() => {
      if (isVersionedBlob(rawBlob)) {
        if (rawBlob.v === version) {
          return {
            currentData: rawBlob.data as Schema[K],
            needsRewrite: false,
          };
        }
        const migrated = migrate?.(rawBlob.data, rawBlob.v) ?? {};
        return {
          currentData: (migrated as Partial<Schema>)[key] ?? defaults[key],
          needsRewrite: true,
        };
      }
      // Legacy raw blob or malformed: attempt migration from v0.
      const migrated = migrate?.(rawBlob, 0) ?? {};
      return {
        currentData: (migrated as Partial<Schema>)[key] ?? defaults[key],
        needsRewrite: true,
      };
    })();

    // Defer the rewrite to an effect so we don't setState during render
    // (React warns + may loop). The first render returns `currentData`
    // already resolved to the migrated value, so the UI sees the right
    // shape immediately; the effect just persists it back to storage.
    useEffect(() => {
      if (needsRewrite) {
        setBlob({
          v: version,
          data: currentData,
        } as VersionedBlob<Schema[K]>);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsRewrite]);

    const setValue = (next: Schema[K] | ((prev: Schema[K]) => Schema[K])) => {
      setBlob((prev: unknown) => {
        const prevData = isVersionedBlob(prev)
          ? (prev.data as Schema[K])
          : currentData;
        return {
          v: version,
          data:
            typeof next === 'function'
              ? (next as (p: Schema[K]) => Schema[K])(prevData)
              : next,
        };
      });
    };

    return [currentData, setValue, reset] as const;
  };
}
