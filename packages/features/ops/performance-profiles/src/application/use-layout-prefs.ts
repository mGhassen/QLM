import { createVersionedPreferenceStore } from '@guepard/ui/use-versioned-preference-store';

const usePerformanceProfilesPrefs = createVersionedPreferenceStore(
  'guepard:performance-profiles',
  {
    columns: {} as Record<string, boolean>,
    columnOrder: [] as string[],
    pageSize: 20,
    columnSizesPx: {} as Record<string, number>,
    pinnedQuickFilters: ['isActive'] as string[],
    showQuickFilters: true,
  },
  { version: 2, migrate: () => ({}) },
);

export function useLayoutPrefs() {
  const [visibleColumns, setVisibleColumns] = usePerformanceProfilesPrefs('columns');
  const [columnOrder, setColumnOrder] = usePerformanceProfilesPrefs('columnOrder');
  const [pageSize, setPageSize] = usePerformanceProfilesPrefs('pageSize');
  const [columnSizesPx, setColumnSizesPx] = usePerformanceProfilesPrefs('columnSizesPx');
  const [pinnedQuickFilters, setPinnedQuickFilters] = usePerformanceProfilesPrefs('pinnedQuickFilters');
  const [showQuickFilters, setShowQuickFilters] = usePerformanceProfilesPrefs('showQuickFilters');

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    pageSize,
    setPageSize,
    columnSizesPx,
    setColumnSizesPx,
    pinnedQuickFilters,
    setPinnedQuickFilters,
    showQuickFilters,
    setShowQuickFilters,
  } as const;
}
