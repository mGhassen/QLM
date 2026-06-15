import type { SortState } from '../qlm/data-table-advanced/types';
import { createVersionedPreferenceStore } from './use-versioned-preference-store';

export type DisplayMode = 'list' | 'grid';

type OpsLayoutPrefsSchema = {
  columns: Record<string, boolean>;
  columnOrder: string[];
  pageSize: number;
  columnSizesPx: Record<string, number>;
  displayMode: DisplayMode;
  pinnedQuickFilters: string[];
  showQuickFilters: boolean;
  search: string;
  gridCols: 1 | 2 | 3;
  sort: SortState | null;
};

/**
 * Factory for the standard ops list-page layout preferences hook.
 * Databases and infrastructure share the same schema — only the store key
 * and version differ. Performance-profiles has a different schema and must
 * not use this factory.
 */
export function createLayoutPrefsHook(options: {
  storeKey: string;
  version: number;
  defaultPinnedQuickFilters?: string[];
}) {
  const { storeKey, version, defaultPinnedQuickFilters = ['status'] } = options;

  const usePrefs = createVersionedPreferenceStore<OpsLayoutPrefsSchema>(
    storeKey,
    {
      columns: {} as Record<string, boolean>,
      columnOrder: [] as string[],
      pageSize: 20,
      columnSizesPx: {} as Record<string, number>,
      displayMode: 'list' as DisplayMode,
      pinnedQuickFilters: defaultPinnedQuickFilters,
      showQuickFilters: true,
      search: '',
      gridCols: 3 as 1 | 2 | 3,
      sort: null as SortState | null,
    },
    { version, migrate: () => ({}) },
  );

  return function useLayoutPrefs() {
    const [visibleColumns, setVisibleColumns] = usePrefs('columns');
    const [columnOrder, setColumnOrder] = usePrefs('columnOrder');
    const [pageSize, setPageSize] = usePrefs('pageSize');
    const [columnSizesPx, setColumnSizesPx] = usePrefs('columnSizesPx');
    const [displayMode, setDisplayMode] = usePrefs('displayMode');
    const [pinnedQuickFilters, setPinnedQuickFilters] =
      usePrefs('pinnedQuickFilters');
    const [showQuickFilters, setShowQuickFilters] =
      usePrefs('showQuickFilters');
    const [search, setSearch] = usePrefs('search');
    const [gridCols, setGridCols] = usePrefs('gridCols');
    const [sort, setSort] = usePrefs('sort');

    return {
      visibleColumns,
      setVisibleColumns,
      columnOrder,
      setColumnOrder,
      pageSize,
      setPageSize,
      columnSizesPx,
      setColumnSizesPx,
      displayMode,
      setDisplayMode,
      pinnedQuickFilters,
      setPinnedQuickFilters,
      showQuickFilters,
      setShowQuickFilters,
      search,
      setSearch,
      gridCols,
      setGridCols,
      sort,
      setSort,
    } as const;
  };
}
