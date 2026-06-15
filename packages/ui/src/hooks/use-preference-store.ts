import { useLocalStorage } from './use-local-storage';

/**
 * Factory for scoped, typed UI preference stores backed by localStorage.
 *
 * Call once at module level with a namespace and a defaults object; use the
 * returned hook inside components to read/write individual preferences.
 * Keys are stored as `<namespace>:<key>` so stores never collide.
 *
 * @example
 * const useNodesPrefs = createPreferenceStore('qlm:nodes', {
 *   displayMode: 'list' as 'list' | 'grid',
 *   pageSize: 20,
 *   sort: null as SortState | null,
 * });
 *
 * // Inside a component:
 * const [displayMode, setDisplayMode] = useNodesPrefs('displayMode');
 * const [pageSize, setPageSize, resetPageSize] = useNodesPrefs('pageSize');
 */
export function createPreferenceStore<Schema extends Record<string, unknown>>(
  namespace: string,
  defaults: Schema,
) {
  return function usePreference<K extends keyof Schema & string>(key: K) {
    return useLocalStorage<Schema[K]>(`${namespace}:${key}`, defaults[key]);
  };
}
