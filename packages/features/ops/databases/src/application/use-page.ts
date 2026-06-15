import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Action } from '@qlm/ui/action';
import {
  exportRowsToCsv,
  type AdvancedColumn,
  type BulkAction,
} from '@qlm/ui/data-table-advanced';
import type { EntityListSortOption } from '@qlm/ui/entity-list';
import { useBulkSelection } from '@qlm/ui/use-bulk-selection';
import { useTableVisibility } from '@qlm/ui/use-table-visibility';
import { useDebouncedValue } from '@qlm/ui/use-debounced-value';

import type { DatabaseOutput } from '@qlm/domain/usecases';
import { useShell } from '@qlm/shell-runtime';

import { useLayoutPrefs, type DisplayMode } from './use-layout-prefs';
import { buildBulkActions, buildRowActions } from './use-actions';
import { buildColumns } from './build-columns';
import { useViewState, type UseViewStateReturn } from './use-view-state';
import { deriveRows } from './derive-rows';

export type UsePageOptions = {
  /** Optional — adds an "Open in tab" row action routing to the per-DB deep page. */
  onOpenInTab?: (db: DatabaseOutput) => void;
  /** Called when the user triggers in-app navigation (default row/card click). */
  onOpenDetails: (db: DatabaseOutput) => void;
};

export type UsePageReturn = {
  // Query / mutations
  databasesQuery: ReturnType<typeof useQuery<DatabaseOutput[]>>;
  mutations: {
    delete: ReturnType<typeof useMutation<void, Error, string>>;
  };

  // URL state
  filters: UseViewStateReturn['filters'];
  setFilters: UseViewStateReturn['setFilters'];
  sort: UseViewStateReturn['sort'];
  setSort: UseViewStateReturn['setSort'];
  pageIndex: UseViewStateReturn['pageIndex'];
  setPageIndex: UseViewStateReturn['setPageIndex'];
  search: UseViewStateReturn['search'];
  setSearch: UseViewStateReturn['setSearch'];
  selection: UseViewStateReturn['selection'];
  setSelection: UseViewStateReturn['setSelection'];

  // Layout prefs
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: (v: Record<string, boolean>) => void;
  columnOrder: string[];
  setColumnOrder: (o: string[]) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  columnSizesPx: Record<string, number>;
  setColumnSizesPx: (s: Record<string, number>) => void;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  pinnedQuickFilters: string[];
  setPinnedQuickFilters: (k: string[]) => void;
  showQuickFilters: boolean;
  setShowQuickFilters: (v: boolean) => void;
  gridCols: 1 | 2 | 3;
  setGridCols: (n: 1 | 2 | 3) => void;

  // Derived / transformed
  rawRows: DatabaseOutput[];
  rows: DatabaseOutput[];
  pagedRows: DatabaseOutput[];
  debouncedSearch: string;
  visibleMap: Record<string, boolean>;

  // Columns
  columns: AdvancedColumn<DatabaseOutput>[];
  sortOptions: EntityListSortOption[];

  // Actions
  rowActions: Action<unknown>[];
  bulkActions: Array<BulkAction<unknown> | Action<unknown>>;

  // Selection
  bulkSelection: ReturnType<typeof useBulkSelection<DatabaseOutput>>;
  selectedRows: DatabaseOutput[];
  clearSelection: () => void;

  // Handlers
  handleDelete: (id: string, onSuccess?: () => void) => Promise<void>;
  toggleStatusFilter: (status: string) => void;
  toggleProviderFilter: (provider: string) => void;
};

export function usePage({
  onOpenInTab,
  onOpenDetails,
}: UsePageOptions): UsePageReturn {
  const { t } = useTranslation('databases');
  const shell = useShell();

  const databasesQuery = useQuery<DatabaseOutput[]>({
    queryKey: shell.databases.keys.list(),
    queryFn: () => shell.databases.list(),
  });

  const {
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
    gridCols,
    setGridCols,
  } = useLayoutPrefs();

  const {
    filters,
    setFilters,
    sort,
    setSort,
    pageIndex,
    setPageIndex,
    search,
    setSearch,
    selection,
    setSelection,
  } = useViewState();

  const debouncedSearch = useDebouncedValue(search, 150);

  const pendingDeletes = useRef<Set<string>>(new Set());

  const rawRows = useMemo<DatabaseOutput[]>(
    () => databasesQuery.data ?? [],
    [databasesQuery.data],
  );

  const handleDelete = useCallback(
    async (id: string, onSuccess?: () => void) => {
      if (pendingDeletes.current.has(id)) return;
      pendingDeletes.current.add(id);
      try {
        await shell.databases.delete(id);
        await shell.databases.invalidate.list();
        toast.success(t('deleteSuccess'));
        onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('deleteFailed'));
      } finally {
        pendingDeletes.current.delete(id);
      }
    },
    [shell.databases, t],
  );

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => shell.databases.delete(id),
    onSuccess: () => shell.databases.invalidate.list(),
  });

  const rowActions = useMemo(
    () =>
      buildRowActions({
        t,
        onViewDetails: onOpenDetails,
        onDelete: (id) => handleDelete(id),
        onOpenInTab,
      }),
    [t, onOpenDetails, handleDelete, onOpenInTab],
  );

  const columns = useMemo(
    () => buildColumns(t, { rowActions }),
    [t, rowActions],
  );

  const { visibleMap } = useTableVisibility(columns, visibleColumns, setVisibleColumns);

  const sortOptions = useMemo<EntityListSortOption[]>(
    () =>
      columns
        .filter((c) => c.sortable && c.key !== 'select' && c.key !== 'actions')
        .map((c) => ({
          value: c.key,
          label: typeof c.label === 'string' ? c.label : c.key,
        })),
    [columns],
  );

  const { rows } = useMemo(
    () => deriveRows({ rawRows, debouncedSearch, filters, sort, columns }),
    [rawRows, debouncedSearch, filters, sort, columns],
  );

  const prevViewKey = useRef<string | null>(null);
  useEffect(() => {
    const viewKey = JSON.stringify({ q: debouncedSearch, f: filters, s: sort });
    if (prevViewKey.current === null) {
      prevViewKey.current = viewKey;
      return;
    }
    if (prevViewKey.current === viewKey) return;
    prevViewKey.current = viewKey;
    setPageIndex(0);
  }, [debouncedSearch, filters, sort, setPageIndex]);

  const pagedRows = useMemo(
    () => rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [rows, pageIndex, pageSize],
  );

  const bulkSelection = useBulkSelection<DatabaseOutput>({
    selected: selection,
    onSelectedChange: setSelection,
    pagedRows,
    allRows: rawRows,
    getId: (db) => db.id,
  });

  const clearSelection = bulkSelection.clear;
  const selectedRows = bulkSelection.selectedRows;

  const bulkActions = useMemo(
    () =>
      buildBulkActions({
        t,
        onCopyIds: async (items) => {
          await navigator.clipboard.writeText(items.map((db) => db.id).join('\n'));
          toast.success(t('copyIdsSuccess', { count: items.length }));
        },
        onCopyJson: async (items) => {
          await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
          toast.success(t('copyJsonSuccess', { count: items.length }));
        },
        onExportCsv: (items) => {
          exportRowsToCsv({
            rows: items,
            columns,
            filename: `databases-${new Date().toISOString().slice(0, 10)}`,
          });
          toast.success(t('exportCsvSuccess', { count: items.length }));
        },
        onBulkDelete: async (items) => {
          try {
            await Promise.all(items.map((db) => shell.databases.delete(db.id)));
            await shell.databases.invalidate.list();
            toast.success(t('bulk.deleteSuccess', { count: items.length }));
            clearSelection();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('bulk.deleteFailed'));
          }
        },
      }),
    [columns, shell.databases, t, clearSelection],
  );

  const toggleStatusFilter = useCallback(
    (status: string) => {
      setFilters((prev) => {
        const existing = prev.find((r) => r.field === 'status' && r.operator === 'in');
        const current = Array.isArray(existing?.value) ? (existing!.value as string[]) : [];
        const next = current.includes(status)
          ? current.filter((v) => v !== status)
          : [...current, status];
        if (!existing && next.length === 0) return prev;
        if (!existing) {
          return [...prev, { id: 'url_status', field: 'status', operator: 'in' as const, value: next }];
        }
        if (next.length === 0) return prev.filter((r) => r.id !== existing.id);
        return prev.map((r) => (r.id === existing.id ? { ...r, value: next } : r));
      });
    },
    [setFilters],
  );

  const toggleProviderFilter = useCallback(
    (provider: string) => {
      setFilters((prev) => {
        const existing = prev.find((r) => r.field === 'provider' && r.operator === 'in');
        const current = Array.isArray(existing?.value) ? (existing!.value as string[]) : [];
        const next = current.includes(provider)
          ? current.filter((v) => v !== provider)
          : [...current, provider];
        if (!existing && next.length === 0) return prev;
        if (!existing) {
          return [...prev, { id: 'url_provider', field: 'provider', operator: 'in' as const, value: next }];
        }
        if (next.length === 0) return prev.filter((r) => r.id !== existing.id);
        return prev.map((r) => (r.id === existing.id ? { ...r, value: next } : r));
      });
    },
    [setFilters],
  );

  return {
    databasesQuery,
    mutations: { delete: deleteMutation },
    filters,
    setFilters,
    sort,
    setSort,
    pageIndex,
    setPageIndex,
    search,
    setSearch,
    selection,
    setSelection,
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
    gridCols,
    setGridCols,
    rawRows,
    rows,
    pagedRows,
    debouncedSearch,
    visibleMap,
    columns,
    sortOptions,
    rowActions,
    bulkActions,
    bulkSelection,
    selectedRows,
    clearSelection,
    handleDelete,
    toggleStatusFilter,
    toggleProviderFilter,
  };
}
