import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@guepard/ui/sonner';

import type { Action } from '@guepard/ui/action';
import {
  exportRowsToCsv,
  toggleInFilter,
  type AdvancedColumn,
  type BulkAction,
} from '@guepard/ui/data-table-advanced';
import type { EntityListSortOption } from '@guepard/ui/entity-list';
import { useBulkSelection } from '@guepard/ui/use-bulk-selection';
import { useTableVisibility } from '@guepard/ui/use-table-visibility';
import { useDebouncedValue } from '@guepard/ui/use-debounced-value';

import type {
  Node,
  NodeDrain,
  NodeLifecycleState,
} from '@guepard/domain/entities';

import { useShell } from '@guepard/shell-runtime';
import { useQueryClient } from '@tanstack/react-query';


import { useFlashing, type FlashKind } from './use-flashing';
import { useLayoutPrefs, type DisplayMode } from './use-layout-prefs';
import {
  buildBulkActions,
  buildRowActions,
} from './use-actions';
import { buildColumns } from './build-columns';
import { useMaxResources } from './selectors';
import { useViewState, type UseViewStateReturn } from './use-view-state';
import { useData, type UseDataReturn } from './use-data';
import { deriveRows } from './derive-rows';

export type UsePageOptions = {
  projectId: string;
  onOpenDetails: (id: string) => void;
  /** Optional — adds an "Open in tab" row action that routes to the per-node deep page. */
  onOpenInTab?: (node: Node) => void;
};

export type UsePageReturn = {
  // Query / mutations
  nodesQuery: UseDataReturn['nodesQuery'];
  mutations: UseDataReturn['mutations'];

  // URL state
  filters: UseViewStateReturn['filters'];
  setFilters: UseViewStateReturn['setFilters'];
  pageIndex: UseViewStateReturn['pageIndex'];
  setPageIndex: UseViewStateReturn['setPageIndex'];
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
  setShowQuickFilters: (next: boolean) => void;
  search: string;
  setSearch: (next: string) => void;
  gridCols: 1 | 2 | 3;
  setGridCols: (n: 1 | 2 | 3) => void;
  sort: ReturnType<typeof useLayoutPrefs>['sort'];
  setSort: ReturnType<typeof useLayoutPrefs>['setSort'];

  // Derived / transformed
  rawRows: Node[];
  searchedRows: Node[];
  filteredRows: Node[];
  rows: Node[];
  pagedRows: Node[];
  debouncedSearch: string;
  visibleMap: Record<string, boolean>;
  maxCpu: number;
  maxMem: number;
  isIdVisible: boolean;

  // Columns
  columns: AdvancedColumn<Node>[];
  nodeSortOptions: EntityListSortOption[];

  // Actions
  rowActions: Action<Node>[];
  bulkActions: Array<BulkAction<Node> | Action<Node>>;
  statusQuickActions: Action<Node>[];

  // Selection
  bulkSelection: ReturnType<typeof useBulkSelection<Node>>;
  selectedRows: Node[];
  clearSelection: () => void;

  // Flash state
  flashingNodes: Map<string, FlashKind>;
  flashClassFor: (id: string) => string | undefined;

  // Handlers
  handleTagClick: (tag: string) => void;
  handleInlineLifecycleChange: (id: string, lifecycle: NodeLifecycleState) => Promise<void>;
  handleDrain: (node: Node) => void;
  handleCancelDrain: (id: string) => Promise<void>;
  handleDelete: (id: string, onSuccess?: () => void) => Promise<void>;
  toggleLifecycleFilter: (lifecycle: string) => void;
  toggleProviderFilter: (provider: string) => void;

  // Drain dialog state — list-page renders <DrainDialog /> wired to these.
  drainTarget: Node | null;
  closeDrainDialog: () => void;
  confirmDrain: (input: { drain: NodeDrain; setIneligibleOnStart: boolean }) => Promise<void>;
  isDrainSubmitting: boolean;
};

export function usePage({ projectId, onOpenDetails, onOpenInTab }: UsePageOptions): UsePageReturn {
  const { t } = useTranslation('nodes');
  const shell = useShell();
  const queryClient = useQueryClient();
  const { nodesQuery, mutations } = useData(projectId);

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
    search,
    setSearch,
    gridCols,
    setGridCols,
    sort,
    setSort,
  } = useLayoutPrefs();

  useEffect(() => {
    if (!sort) {
      setSort({ key: 'status', direction: 'asc' });
    }
  }, [sort, setSort]);

  const handleBeforeChange = useCallback(
    () => void queryClient.cancelQueries({ queryKey: shell.nodes.keys.listByProject(projectId) }),
    [queryClient, shell.nodes.keys, projectId],
  );

  // URL state
  const {
    filters,
    setFilters,
    pageIndex,
    setPageIndex,
    selection,
    setSelection,
  } = useViewState({ onBeforeChange: handleBeforeChange });

  const debouncedSearch = useDebouncedValue(search, 150);

  /**
   * Node ids with an in-flight lifecycle / drain mutation. Blocks
   * double-clicks from queueing redundant mutations (+ avoids the
   * version-conflict 409 a second click would now trigger on the
   * optimistic-concurrency path).
   */
  const pendingAxisChanges = useRef<Set<string>>(new Set());
  /**
   * Gates concurrent delete calls so a rapid double-click on the
   * confirm button (or two simultaneous delete paths — dropdown +
   * details sheet) can't stack two DELETE requests, the second of which
   * would 404 after the first finished and raise a spurious "not found"
   * toast.
   */
  const pendingDeletes = useRef<Set<string>>(new Set());

  const { flashingNodes, flashNodes, flashClassFor } = useFlashing();

  // Hoisted above callbacks that need `node.version` for optimistic
  // concurrency so there's no temporal-dead-zone reference in the dep arrays.
  // `NodeOutput` is structurally identical to `Node` (same fields) — a plain
  // type assertion is safe; no double-cast needed.
  const rawRows = useMemo<Node[]>(
    () => nodesQuery.data?.items ?? [],
    [nodesQuery.data],
  );

  const handleTagClick = useCallback(
    (tag: string) => {
      setFilters((prev) => {
        const already = prev.some(
          (r) =>
            r.field === 'tags' &&
            r.operator === 'contains' &&
            r.value === tag,
        );
        if (already) return prev;
        return [
          ...prev,
          {
            id: `r_${Math.random().toString(36).slice(2, 10)}`,
            field: 'tags',
            operator: 'contains' as const,
            value: tag,
          },
        ];
      });
    },
    [setFilters],
  );

  const handleInlineLifecycleChange = useCallback(
    async (id: string, lifecycle: NodeLifecycleState) => {
      if (pendingAxisChanges.current.has(id)) return;
      pendingAxisChanges.current.add(id);
      const successKey =
        lifecycle === 'active' ? 'bulk.startSuccess' : 'bulk.stopSuccess';
      const errorKey =
        lifecycle === 'active' ? 'bulk.startFailed' : 'bulk.stopFailed';
      const flashKind: FlashKind = lifecycle === 'active' ? 'running' : 'stopped';
      const node = rawRows.find((n) => n.id === id);
      if (!node) {
        pendingAxisChanges.current.delete(id);
        return;
      }
      flashNodes([id], flashKind);
      try {
        await mutations.setLifecycle.mutateAsync({
          id,
          lifecycle,
          expectedVersion: node.version,
        });
        toast.success(t(successKey, { count: 1 }));
      } catch (error) {
        const httpStatus = (error as { status?: number } | null)?.status;
        const code = (error as { code?: number } | null)?.code;
        if (httpStatus !== 409 && code !== 3001 && code !== 3101) {
          toast.error(error instanceof Error ? error.message : t(errorKey));
        }
      } finally {
        pendingAxisChanges.current.delete(id);
      }
    },
    [mutations.setLifecycle, t, flashNodes, rawRows],
  );

  /**
   * Drain handler — opens the `<DrainDialog>` so the operator picks the
   * deadline / force / ignoreSystemJobs / setIneligibleOnStart values
   * explicitly (RFC §5.5a). The actual mutation fires from
   * `confirmDrain` once the dialog submits.
   */
  const [drainTarget, setDrainTarget] = useState<Node | null>(null);
  const [isDrainSubmitting, setIsDrainSubmitting] = useState(false);

  const handleDrain = useCallback((node: Node) => {
    setDrainTarget(node);
  }, []);

  const closeDrainDialog = useCallback(() => {
    setDrainTarget(null);
  }, []);

  const confirmDrain = useCallback(
    async (input: { drain: NodeDrain; setIneligibleOnStart: boolean }) => {
      const node = drainTarget;
      if (!node) return;
      if (pendingAxisChanges.current.has(node.id)) return;
      pendingAxisChanges.current.add(node.id);
      setIsDrainSubmitting(true);
      flashNodes([node.id], 'draining');
      try {
        await mutations.drain.mutateAsync({
          id: node.id,
          drain: input.drain,
          expectedVersion: node.version,
          setIneligibleOnStart: input.setIneligibleOnStart,
        });
        toast.success(t('bulk.drainSuccess', { count: 1 }));
        setDrainTarget(null);
      } catch (error) {
        const httpStatus = (error as { status?: number } | null)?.status;
        const code = (error as { code?: number } | null)?.code;
        if (httpStatus !== 409 && code !== 3001 && code !== 3101) {
          toast.error(
            error instanceof Error ? error.message : t('bulk.drainFailed'),
          );
        }
      } finally {
        pendingAxisChanges.current.delete(node.id);
        setIsDrainSubmitting(false);
      }
    },
    [drainTarget, mutations.drain, t, flashNodes],
  );

  const handleCancelDrain = useCallback(
    async (id: string) => {
      if (pendingAxisChanges.current.has(id)) return;
      pendingAxisChanges.current.add(id);
      const node = rawRows.find((n) => n.id === id);
      if (!node) {
        pendingAxisChanges.current.delete(id);
        return;
      }
      flashNodes([id], 'running');
      try {
        await mutations.drainCancel.mutateAsync({
          id,
          expectedVersion: node.version,
          keepIneligible: false,
        });
        toast.success(t('bulk.drainCancelSuccess', { count: 1 }));
      } catch (error) {
        const httpStatus = (error as { status?: number } | null)?.status;
        const code = (error as { code?: number } | null)?.code;
        if (httpStatus !== 409 && code !== 3001 && code !== 3101) {
          toast.error(
            error instanceof Error ? error.message : t('bulk.drainCancelFailed'),
          );
        }
      } finally {
        pendingAxisChanges.current.delete(id);
      }
    },
    [mutations.drainCancel, t, flashNodes, rawRows],
  );

  const isIdVisible = visibleColumns['nodeId'] ?? false;

  const { maxCpu, maxMem } = useMaxResources(rawRows);

  const handleDelete = useCallback(
    async (id: string, onSuccess?: () => void) => {
      if (pendingDeletes.current.has(id)) return;
      pendingDeletes.current.add(id);
      try {
        await mutations.delete.mutateAsync(id);
        toast.success(t('details.deleteSuccess'));
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('details.deleteFailed'),
        );
      } finally {
        pendingDeletes.current.delete(id);
      }
    },
    [mutations.delete, t],
  );

  const rowActions = useMemo(
    () =>
      buildRowActions({
        t,
        onViewDetails: (n) => onOpenDetails(n.id),
        onDelete: (id) => handleDelete(id),
        onSetLifecycle: (id, lifecycle) =>
          handleInlineLifecycleChange(id, lifecycle),
        onDrain: handleDrain,
        onCancelDrain: handleCancelDrain,
        onOpenInTab,
      }),
    [
      t,
      onOpenDetails,
      handleDelete,
      handleInlineLifecycleChange,
      handleDrain,
      handleCancelDrain,
      onOpenInTab,
    ],
  );

  const statusQuickActions = useMemo(
    () =>
      rowActions.filter(
        (a) =>
          a.id === 'start' ||
          a.id === 'drain' ||
          a.id === 'cancelDrain' ||
          a.id === 'stop',
      ),
    [rowActions],
  );

  const columns = useMemo(
    () => buildColumns({ t, debouncedSearch, isIdVisible, maxCpu, maxMem, rowActions, statusQuickActions, onTagClick: handleTagClick }),
    [t, debouncedSearch, isIdVisible, maxCpu, maxMem, rowActions, statusQuickActions, handleTagClick],
  );

  const { visibleMap } = useTableVisibility(columns, visibleColumns, setVisibleColumns);

  const nodeSortOptions = useMemo<EntityListSortOption[]>(
    () =>
      columns
        .filter(
          (c) =>
            c.sortable &&
            c.key !== 'select' &&
            c.key !== 'actions' &&
            visibleMap[c.key] !== false,
        )
        .map((c) => ({
          value: c.key,
          label: typeof c.label === 'string' ? c.label : c.key,
        })),
    [columns, visibleMap],
  );

  const { searchedRows, filteredRows, rows } = useMemo(() => {
    const start = typeof performance !== 'undefined' ? performance.now() : 0;
    const out = deriveRows({
      rawRows,
      debouncedSearch,
      filters,
      sort,
      columns,
    });
    const end = typeof performance !== 'undefined' ? performance.now() : 0;
    if (
      (globalThis as unknown as { __GUEPARD_DEBUG_OPS__?: boolean }).__GUEPARD_DEBUG_OPS__ &&
      end - start > 16
    ) {
      // eslint-disable-next-line no-console
      console.debug('[ops][infrastructure] deriveRows ms=', Math.round(end - start), {
        raw: rawRows.length,
        searched: out.searchedRows.length,
        filtered: out.filteredRows.length,
        sort: sort?.key ?? null,
        q: debouncedSearch ? debouncedSearch.slice(0, 32) : '',
        filters: filters.length,
      });
    }
    return out;
  }, [rawRows, debouncedSearch, filters, sort, columns]);

  /**
   * Reset pagination only when search/filter/sort CONTENT changes.
   * - Skip-first-run preserves a URL like `?page=2` on mount.
   * - `visibleColumns` intentionally excluded: toggling a column should
   *   not kick the user back to page 1.
   * - React's dep comparison (Object.is) is sufficient: filter setters
   *   always produce new array refs on content change via functional updaters.
   */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPageIndex(0);
  }, [debouncedSearch, filters, sort, setPageIndex]);

  const pagedRows = useMemo(
    () => rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [rows, pageIndex, pageSize],
  );

  const bulkSelection = useBulkSelection<Node>({
    selected: selection,
    onSelectedChange: setSelection,
    pagedRows,
    allRows: rawRows,
    getId: (n) => n.id,
  });

  const clearSelection = bulkSelection.clear;
  const selectedRows = bulkSelection.selectedRows;

  /**
   * Bulk runners use `Promise.allSettled` so a single 409 (version
   * conflict) on one node doesn't abort the whole batch — mirrors the
   * partial-failure shape of `bulkDelete`. Toast surfaces succeeded /
   * failed counts; failed nodes stay selected for retry.
   */
  const runBulkLifecycleChange = useCallback(
    async (
      items: Node[],
      targetLifecycle: NodeLifecycleState,
      flashKind: FlashKind,
      filter: (n: Node) => boolean,
      successKey: string,
      failureKey: string,
    ) => {
      const eligible = items.filter(filter);
      if (eligible.length === 0) return;
      flashNodes(eligible.map((n) => n.id), flashKind);
      const results = await Promise.allSettled(
        eligible.map((n) =>
          mutations.setLifecycle.mutateAsync({
            id: n.id,
            lifecycle: targetLifecycle,
            expectedVersion: n.version,
          }),
        ),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(t(successKey, { count: succeeded }));
      }
      if (failed > 0) {
        toast.error(t(failureKey, { count: failed }));
      } else {
        clearSelection();
      }
    },
    [mutations.setLifecycle, t, clearSelection, flashNodes],
  );

  const runBulkDrain = useCallback(
    async (items: Node[]) => {
      const eligible = items.filter(
        (n) => n.lifecycle === 'active' && !n.drain?.active,
      );
      if (eligible.length === 0) return;
      flashNodes(eligible.map((n) => n.id), 'draining');
      const results = await Promise.allSettled(
        eligible.map((n) =>
          mutations.drain.mutateAsync({
            id: n.id,
            drain: {
              active: true,
              ignoreSystemJobs: false,
              force: false,
            },
            expectedVersion: n.version,
            setIneligibleOnStart: true,
          }),
        ),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(t('bulk.drainSuccess', { count: succeeded }));
      }
      if (failed > 0) {
        toast.error(t('bulk.drainFailed', { count: failed }));
      } else {
        clearSelection();
      }
    },
    [mutations.drain, t, clearSelection, flashNodes],
  );

  const bulkActions = useMemo(
    () =>
      buildBulkActions({
        t,
        onCopyIds: async (items) => {
          await navigator.clipboard.writeText(
            items.map((n) => n.id).join('\n'),
          );
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
            filename: `nodes-${new Date().toISOString().slice(0, 10)}`,
          });
          toast.success(t('exportCsvSuccess', { count: items.length }));
        },
        onBulkStart: (items) =>
          runBulkLifecycleChange(
            items,
            'active',
            'running',
            (n) => n.lifecycle !== 'active' && !n.drain?.active,
            'bulk.startSuccess',
            'bulk.startFailed',
          ),
        onBulkDrain: (items) => runBulkDrain(items),
        onBulkStop: (items) =>
          runBulkLifecycleChange(
            items,
            'stopped',
            'stopped',
            (n) => n.lifecycle !== 'stopped',
            'bulk.stopSuccess',
            'bulk.stopFailed',
          ),
        onBulkDelete: async (items) => {
          try {
            await mutations.bulkDelete.mutateAsync(items.map((n) => n.id));
            toast.success(t('bulk.deleteSuccess', { count: items.length }));
            clearSelection();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : t('bulk.deleteFailed'),
            );
          }
        },
      }),
    [columns, mutations.bulkDelete, runBulkLifecycleChange, runBulkDrain, t, clearSelection],
  );

  const toggleLifecycleFilter = useCallback(
    (lifecycle: string) => setFilters((prev) => toggleInFilter(prev, 'lifecycle', 'url_lifecycle', lifecycle)),
    [setFilters],
  );

  const toggleProviderFilter = useCallback(
    (provider: string) => setFilters((prev) => toggleInFilter(prev, 'provider', 'url_provider', provider)),
    [setFilters],
  );

  return {
    // Query / mutations
    nodesQuery,
    mutations,

    // URL state
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

    // Layout prefs
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

    // Derived
    rawRows,
    searchedRows,
    filteredRows,
    rows,
    pagedRows,
    debouncedSearch,
    visibleMap,
    maxCpu,
    maxMem,
    isIdVisible,

    // Columns
    columns,
    nodeSortOptions,

    // Actions
    rowActions,
    bulkActions,
    statusQuickActions,

    // Selection
    bulkSelection,
    selectedRows,
    clearSelection,

    // Flash state
    flashingNodes,
    flashClassFor,

    // Handlers
    handleTagClick,
    handleInlineLifecycleChange,
    handleDrain,
    handleCancelDrain,
    handleDelete,
    toggleLifecycleFilter,
    toggleProviderFilter,

    // Drain dialog state
    drainTarget,
    closeDrainDialog,
    confirmDrain,
    isDrainSubmitting,
  };
}
