import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Checkbox } from '../../shadcn/checkbox';
import { Button, buttonVariants } from '../../shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shadcn/table';
import { cn } from '../../lib/utils';
import type { AdvancedColumn, SortState } from './types';
import { computeAutoColumnSizesPx, type AutoFitOptions } from './auto-fit';

export type DataTablePagination = {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  onPageIndexChange: (next: number) => void;
  /** Optional; if omitted, page size is fixed. */
  onPageSizeChange?: (next: number) => void;
  pageSizeOptions?: number[];
  label: {
    page: (pageIndex: number, pageCount: number) => string;
    prev: string;
    next: string;
    showing?: (from: number, to: number, total: number) => string;
    rowsPerPage?: string;
  };
};

export type DataTableAdvancedProps<T> = {
  columns: AdvancedColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;

  /** Controlled selection: set of selected row IDs. */
  selection: Set<string>;
  onSelectionChange: (next: Set<string>) => void;

  /** Controlled column visibility map keyed by column key. */
  visibleColumns: Record<string, boolean>;

  /** Controlled sort state; `null` when unsorted. */
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;

  /** Controlled column order (keys). Only applies to visible data columns. */
  columnOrder?: string[];
  onColumnOrderChange?: (next: string[]) => void;
  reorderColumnAriaLabel?: string;

  /** Controlled column sizes in px keyed by column key. */
  columnSizesPx?: Record<string, number>;
  onColumnSizesPxChange?: (next: Record<string, number>) => void;
  resizeColumnAriaLabel?: string;

  /** Controlled pagination. When set, table slices rows to the active page. */
  pagination?: DataTablePagination;

  /** Auto-size columns from visible row content. User-dragged sizes still win. */
  autoFitColumns?: boolean;
  autoFitOptions?: AutoFitOptions;

  /**
   * Sticky left columns (after the selection checkbox column).
   * Example: ['name'] keeps selection + name visible on horizontal scroll.
   */
  stickyLeftColumnKeys?: string[];

  /**
   * Sticky right columns (fixed to right edge, always visible on horizontal scroll).
   * Example: ['actions'] keeps the actions button visible.
   */
  stickyRightColumnKeys?: string[];

  onRowClick?: (row: T) => void;
  /** Optional extra className applied to each data row. */
  getRowClassName?: (row: T) => string | undefined;
  emptyLabel: string;
  selectAllAriaLabel: string;
  selectRowAriaLabel: string;

  /** Render an expanded panel below each row. Enables the expand toggle column. */
  renderExpandedRow?: (row: T) => ReactNode;
  /** Hide the expand chevron for rows that can't expand. Defaults to true when renderExpandedRow given. */
  isRowExpandable?: (row: T) => boolean;
  /** Controlled set of expanded row IDs. Omit for internal state. */
  expandedRowIds?: Set<string>;
  onExpandedRowIdsChange?: (next: Set<string>) => void;
  expandRowAriaLabel?: string;

  /** Highlight a single row (e.g. the currently-opened detail sheet's row). */
  activeRowId?: string;
};

export function DataTableAdvanced<T>({
  columns,
  rows,
  getRowId,
  selection,
  onSelectionChange,
  visibleColumns,
  sort,
  onSortChange,
  columnOrder,
  onColumnOrderChange,
  reorderColumnAriaLabel,
  columnSizesPx,
  onColumnSizesPxChange,
  resizeColumnAriaLabel,
  pagination,
  autoFitColumns,
  autoFitOptions,
  stickyLeftColumnKeys,
  stickyRightColumnKeys,
  onRowClick,
  getRowClassName,
  emptyLabel,
  selectAllAriaLabel,
  selectRowAriaLabel,
  renderExpandedRow,
  isRowExpandable,
  expandedRowIds,
  onExpandedRowIdsChange,
  expandRowAriaLabel,
  activeRowId,
}: Readonly<DataTableAdvancedProps<T>>) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set(),
  );
  const effectiveExpanded = expandedRowIds ?? internalExpanded;
  const setExpanded = onExpandedRowIdsChange ?? setInternalExpanded;
  const toggleRowExpansion = useCallback(
    (rowId: string) => {
      const next = new Set(effectiveExpanded);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      setExpanded(next);
    },
    [effectiveExpanded, setExpanded],
  );
  const visibleCols = useMemo(
    () =>
      columns.filter(
        (c) => c.required || (visibleColumns[c.key] ?? !c.defaultHidden),
      ),
    [columns, visibleColumns],
  );

  const effectiveColumns = useMemo(() => {
    const stickyLeftSet = new Set(stickyLeftColumnKeys ?? []);
    const stickyRightSet = new Set(stickyRightColumnKeys ?? []);
    const byKey = new Map(visibleCols.map((c) => [c.key, c] as const));

    // Middle (non-sticky) columns in user-specified or definition order
    const middle: AdvancedColumn<T>[] = [];
    const source = columnOrder?.length
      ? columnOrder
      : visibleCols.map((c) => c.key);
    for (const key of source) {
      const col = byKey.get(key);
      if (col && !stickyLeftSet.has(key) && !stickyRightSet.has(key))
        middle.push(col);
    }
    for (const col of visibleCols) {
      if (
        !middle.some((c) => c.key === col.key) &&
        !stickyLeftSet.has(col.key) &&
        !stickyRightSet.has(col.key)
      ) {
        middle.push(col);
      }
    }

    // Sticky-left always first, sticky-right always last (definition order)
    const leftCols = (stickyLeftColumnKeys ?? [])
      .map((k) => byKey.get(k))
      .filter(Boolean) as AdvancedColumn<T>[];
    const rightCols = (stickyRightColumnKeys ?? [])
      .map((k) => byKey.get(k))
      .filter(Boolean) as AdvancedColumn<T>[];
    return [...leftCols, ...middle, ...rightCols];
  }, [visibleCols, columnOrder, stickyLeftColumnKeys, stickyRightColumnKeys]);

  const pageRows = useMemo(() => {
    if (!pagination) return rows;
    const start = pagination.pageIndex * pagination.pageSize;
    return rows.slice(start, start + pagination.pageSize);
  }, [rows, pagination]);

  const autoSizes = useMemo<Record<string, number>>(() => {
    if (!autoFitColumns) return {};
    return computeAutoColumnSizesPx(pageRows, effectiveColumns, autoFitOptions);
  }, [autoFitColumns, autoFitOptions, pageRows, effectiveColumns]);

  const hasAnyWidth =
    autoFitColumns ||
    effectiveColumns.some(
      (c) => c.width || typeof columnSizesPx?.[c.key] === 'number',
    );

  const evenWidthPctMap = useMemo<Record<string, string>>(() => {
    if (hasAnyWidth) return {};
    const flexKeys: string[] = [];
    for (const col of effectiveColumns) {
      const isFixed =
        (typeof col.minWidthPx === 'number' &&
          typeof col.maxWidthPx === 'number' &&
          col.minWidthPx === col.maxWidthPx) ||
        /^(\d+)px$/.test(col.width?.trim() ?? '');
      if (!isFixed) flexKeys.push(col.key);
    }
    if (flexKeys.length === 0) return {};
    const pct = `${100 / flexKeys.length}%`;
    return Object.fromEntries(flexKeys.map((k) => [k, pct]));
  }, [effectiveColumns, hasAnyWidth]);
  const hasEvenWidths = Object.keys(evenWidthPctMap).length > 0;

  const STICKY_SELECTION_W = 44;
  const stickyOffsetsPx = useMemo<Record<string, number>>(() => {
    if (!stickyLeftColumnKeys?.length) return {};
    let left = STICKY_SELECTION_W;
    const map: Record<string, number> = {};
    for (const col of effectiveColumns) {
      if (!stickyLeftColumnKeys.includes(col.key)) continue;
      map[col.key] = left;
      left += resolveWidthPx(col, columnSizesPx, autoSizes) ?? 220;
    }
    return map;
  }, [stickyLeftColumnKeys, effectiveColumns, columnSizesPx, autoSizes]);

  const firstNonStickyKey = useMemo(() => {
    for (const col of effectiveColumns) {
      if (stickyOffsetsPx[col.key] === undefined) return col.key;
    }
    return null;
  }, [effectiveColumns, stickyOffsetsPx]);

  const stickyRightOffsetsPx = useMemo<Record<string, number>>(() => {
    if (!stickyRightColumnKeys?.length) return {};
    let right = 0;
    const map: Record<string, number> = {};
    for (const col of [...effectiveColumns].reverse()) {
      if (!stickyRightColumnKeys.includes(col.key)) continue;
      map[col.key] = right;
      right += resolveWidthPx(col, columnSizesPx, autoSizes) ?? 48;
    }
    return map;
  }, [stickyRightColumnKeys, effectiveColumns, columnSizesPx, autoSizes]);

  const lastNonStickyRightKey = useMemo(() => {
    if (!stickyRightColumnKeys?.length) return null;
    for (let i = effectiveColumns.length - 1; i >= 0; i--) {
      const col = effectiveColumns[i]!;
      if (!stickyRightColumnKeys.includes(col.key)) return col.key;
    }
    return null;
  }, [effectiveColumns, stickyRightColumnKeys]);

  const allSelected =
    pageRows.length > 0 && pageRows.every((r) => selection.has(getRowId(r)));
  const someSelected =
    !allSelected && pageRows.some((r) => selection.has(getRowId(r)));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      const next = new Set(selection);
      for (const r of pageRows) next.delete(getRowId(r));
      onSelectionChange(next);
    } else {
      const next = new Set(selection);
      for (const r of pageRows) next.add(getRowId(r));
      onSelectionChange(next);
    }
  }, [allSelected, pageRows, getRowId, selection, onSelectionChange]);

  const lastSelectedKey = useRef<string | null>(null);

  const toggleRow = useCallback(
    (id: string, shiftKey?: boolean) => {
      if (shiftKey && lastSelectedKey.current) {
        const allIds = pageRows.map((r) => getRowId(r));
        const anchorIdx = allIds.indexOf(lastSelectedKey.current);
        const targetIdx = allIds.indexOf(id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const [from, to] =
            anchorIdx < targetIdx
              ? [anchorIdx, targetIdx]
              : [targetIdx, anchorIdx];
          const next = new Set(selection);
          for (let i = from; i <= to; i++) next.add(allIds[i]!);
          onSelectionChange(next);
          return;
        }
      }
      const next = new Set(selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      lastSelectedKey.current = id;
      onSelectionChange(next);
    },
    [selection, onSelectionChange, pageRows, getRowId],
  );

  const clickSortHeader = (key: string) => {
    if (sort?.key !== key) {
      onSortChange({ key, direction: 'desc' });
      return;
    }
    if (sort.direction === 'desc') {
      onSortChange({ key, direction: 'asc' });
      return;
    }
    onSortChange(null);
  };

  const canReorder = !!onColumnOrderChange;
  const canResize = !!onColumnSizesPxChange;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const onDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;
    const keys = effectiveColumns.map((c) => c.key);
    const stickyKeys = new Set([
      ...Object.keys(stickyOffsetsPx),
      ...Object.keys(stickyRightOffsetsPx),
    ]);
    const draggable = keys.filter((k) => !stickyKeys.has(k));
    const from = draggable.indexOf(activeId);
    const to = draggable.indexOf(overId);
    if (from === -1 || to === -1) return;
    const nextDraggable = arrayMove(draggable, from, to);
    const nextKeys: string[] = [];
    for (const k of keys) {
      if (stickyKeys.has(k)) nextKeys.push(k);
    }
    for (const k of nextDraggable) nextKeys.push(k);
    onColumnOrderChange!(nextKeys);
  };

  return (
    <div className="border-border bg-card flex h-full flex-col overflow-hidden rounded-lg border">
      <Table
        className={cn((hasAnyWidth || hasEvenWidths) && 'table-fixed')}
        wrapperClassName="min-h-0 flex-1 overflow-auto"
      >
        <TableHeader className="border-border bg-card sticky top-0 z-20 border-b">
          <TableRow className="bg-card hover:bg-transparent">
            {renderExpandedRow && (
              <TableHead
                className="bg-card border-border sticky top-0 z-30 w-[36px] border-b p-0"
                style={{ left: 0, top: 0 }}
              >
                <span className="sr-only">
                  {expandRowAriaLabel ?? 'Expand row'}
                </span>
              </TableHead>
            )}
            <TableHead
              className="bg-card border-border sticky top-0 z-30 w-[44px] border-b p-0 shadow-[inset_-1px_0_0_hsl(var(--border))]"
              style={{ left: renderExpandedRow ? 36 : 0, top: 0 }}
            >
              <div className="flex h-10 w-full items-center justify-center">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? 'indeterminate' : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label={selectAllAriaLabel}
                />
              </div>
            </TableHead>
            {canReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={effectiveColumns
                    .filter(
                      (c) =>
                        stickyOffsetsPx[c.key] === undefined &&
                        stickyRightOffsetsPx[c.key] === undefined,
                    )
                    .map((c) => c.key)}
                  strategy={horizontalListSortingStrategy}
                >
                  {effectiveColumns.map((col) => {
                    const stickyLeftPx = stickyOffsetsPx[col.key];
                    const isSticky = typeof stickyLeftPx === 'number';
                    const stickyRightPx = stickyRightOffsetsPx[col.key];
                    const isStickyRight = typeof stickyRightPx === 'number';

                    if (isSticky || isStickyRight) {
                      return (
                        <TableHead
                          key={col.key}
                          style={{
                            ...headerStyle(
                              col,
                              columnSizesPx,
                              autoSizes,
                              evenWidthPctMap,
                            ),
                            position: 'sticky',
                            ...(isSticky
                              ? { left: stickyLeftPx, top: 0 }
                              : { right: stickyRightPx, top: 0 }),
                          }}
                          className={cn(
                            'text-muted-foreground relative text-sm font-semibold',
                            'bg-card border-border sticky z-20 border-b',
                            isSticky &&
                              'shadow-[inset_-1px_0_0_hsl(var(--border))]',
                            isStickyRight &&
                              'shadow-[inset_1px_0_0_hsl(var(--border))]',
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                                ? 'text-center'
                                : 'text-left',
                            col.sortable && 'select-none',
                          )}
                        >
                          <div
                            className={cn(
                              'flex min-w-0 items-center gap-1',
                              col.align === 'center' && 'justify-center',
                              col.align === 'right' && 'justify-end',
                            )}
                          >
                            <span className="min-w-0 truncate">
                              <HeaderContent col={col} />
                            </span>
                            {col.sortable && (
                              <SortButton
                                colKey={col.key}
                                sort={sort}
                                onToggle={clickSortHeader}
                              />
                            )}
                          </div>
                          {canResize && !isStickyRight && (
                            <ResizeHandle
                              ariaLabel={resizeColumnAriaLabel ?? col.key}
                              getWidthPx={() =>
                                resolveWidthPx(col, columnSizesPx, autoSizes) ??
                                resolveWidthPx(col, undefined, autoSizes) ??
                                220
                              }
                              minWidthPx={clampHeaderMinWidthPx(col)}
                              maxWidthPx={col.maxWidthPx}
                              onResize={(nextPx) => {
                                if (!onColumnSizesPxChange) return;
                                onColumnSizesPxChange({
                                  ...(columnSizesPx ?? {}),
                                  [col.key]: nextPx,
                                });
                              }}
                            />
                          )}
                        </TableHead>
                      );
                    }

                    return (
                      <SortableHeaderCell
                        key={col.key}
                        colKey={col.key}
                        style={headerStyle(
                          col,
                          columnSizesPx,
                          autoSizes,
                          evenWidthPctMap,
                        )}
                        reorderColumnAriaLabel={reorderColumnAriaLabel}
                        canResize={canResize}
                        resizeColumnAriaLabel={resizeColumnAriaLabel}
                        className={cn(
                          col.key === firstNonStickyKey && 'pl-4',
                          'border-border border-b',
                          col.key !== lastNonStickyRightKey &&
                            'border-border/40 border-r',
                        )}
                        onResize={(nextPx) => {
                          if (!onColumnSizesPxChange) return;
                          onColumnSizesPxChange({
                            ...(columnSizesPx ?? {}),
                            [col.key]: nextPx,
                          });
                        }}
                        minWidthPx={clampHeaderMinWidthPx(col)}
                        maxWidthPx={col.maxWidthPx}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <span className="min-w-0 truncate">
                            <HeaderContent col={col} />
                          </span>
                          {col.sortable && (
                            <SortButton
                              colKey={col.key}
                              sort={sort}
                              onToggle={clickSortHeader}
                            />
                          )}
                        </div>
                      </SortableHeaderCell>
                    );
                  })}
                </SortableContext>
              </DndContext>
            ) : (
              effectiveColumns.map((col) =>
                (() => {
                  const stickyLeftPx = stickyOffsetsPx[col.key];
                  const isSticky = typeof stickyLeftPx === 'number';
                  const stickyRightPx = stickyRightOffsetsPx[col.key];
                  const isStickyRight = typeof stickyRightPx === 'number';
                  return (
                    <TableHead
                      key={col.key}
                      style={{
                        ...headerStyle(
                          col,
                          columnSizesPx,
                          autoSizes,
                          evenWidthPctMap,
                        ),
                        ...(isSticky
                          ? { position: 'sticky', left: stickyLeftPx, top: 0 }
                          : isStickyRight
                            ? {
                                position: 'sticky',
                                right: stickyRightPx,
                                top: 0,
                              }
                            : { position: 'sticky', top: 0 }),
                      }}
                      className={cn(
                        'text-muted-foreground border-border relative border-b text-sm font-semibold',
                        isSticky &&
                          'bg-card sticky z-20 shadow-[inset_-1px_0_0_hsl(var(--border))]',
                        isStickyRight &&
                          'bg-card sticky z-20 shadow-[inset_1px_0_0_hsl(var(--border))]',
                        !isSticky && !isStickyRight && 'bg-card sticky z-10',
                        !isSticky &&
                          !isStickyRight &&
                          col.key === firstNonStickyKey &&
                          'pl-4',
                        !isSticky &&
                          !isStickyRight &&
                          col.key !== lastNonStickyRightKey &&
                          'border-border/40 border-r',
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                        col.sortable && 'select-none',
                      )}
                    >
                      <div
                        className={cn(
                          'flex min-w-0 items-center gap-1',
                          col.align === 'center' && 'justify-center',
                          col.align === 'right' && 'justify-end',
                        )}
                      >
                        <span className="min-w-0 truncate">
                          <HeaderContent col={col} />
                        </span>
                        {col.sortable && (
                          <SortButton
                            colKey={col.key}
                            sort={sort}
                            onToggle={clickSortHeader}
                          />
                        )}
                      </div>
                      {canResize && !isStickyRight && (
                        <ResizeHandle
                          ariaLabel={resizeColumnAriaLabel ?? col.key}
                          getWidthPx={() =>
                            resolveWidthPx(col, columnSizesPx, autoSizes) ??
                            resolveWidthPx(col, undefined, autoSizes) ??
                            220
                          }
                          minWidthPx={clampHeaderMinWidthPx(col)}
                          maxWidthPx={col.maxWidthPx}
                          onResize={(nextPx) => {
                            if (!onColumnSizesPxChange) return;
                            onColumnSizesPxChange({
                              ...(columnSizesPx ?? {}),
                              [col.key]: nextPx,
                            });
                          }}
                        />
                      )}
                    </TableHead>
                  );
                })(),
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  effectiveColumns.length + 1 + (renderExpandedRow ? 1 : 0)
                }
                className="text-muted-foreground h-36 text-center align-middle text-sm"
              >
                <div className="flex h-full w-full items-center justify-center">
                  {emptyLabel}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row, idx) => {
              const id = getRowId(row);
              const isSelected = selection.has(id);
              const isLastRow = idx === pageRows.length - 1;
              const isExpanded = effectiveExpanded.has(id);
              const canExpand =
                renderExpandedRow !== undefined &&
                (isRowExpandable ? isRowExpandable(row) : true);
              const isActive = activeRowId !== undefined && id === activeRowId;
              return (
                <Fragment key={id}>
                  <TableRow
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'group even:bg-muted/[0.03]',
                      isLastRow && !isExpanded && 'border-border border-b',
                      onRowClick && 'cursor-pointer',
                      isActive && 'bg-primary/10 hover:bg-primary/15',
                      getRowClassName?.(row),
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {renderExpandedRow && (
                      <TableCell
                        className={cn(
                          'bg-card sticky left-0 z-10 p-0 align-middle',
                          isLastRow &&
                            !isExpanded &&
                            'border-border/60 border-b',
                          'group-data-[state=selected]:bg-muted group-even:[background-color:color-mix(in_oklab,hsl(var(--muted))_3%,hsl(var(--card)))] group-hover:[background-color:color-mix(in_oklab,hsl(var(--muted))_30%,hsl(var(--card)))]',
                        )}
                        style={{ left: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex h-full min-h-10 w-full items-center justify-center">
                          {canExpand ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              aria-label={expandRowAriaLabel ?? 'Toggle row'}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="h-6 w-6" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        'sticky z-10 p-0 align-middle shadow-[inset_-1px_0_0_hsl(var(--border))]',
                        isLastRow && !isExpanded && 'border-border/60 border-b',
                        'bg-card group-data-[state=selected]:bg-muted group-even:[background-color:color-mix(in_oklab,hsl(var(--muted))_3%,hsl(var(--card)))] group-hover:[background-color:color-mix(in_oklab,hsl(var(--muted))_30%,hsl(var(--card)))]',
                      )}
                      style={{ left: renderExpandedRow ? 36 : 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="flex h-full min-h-10 w-full items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(id, e.shiftKey);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          aria-label={selectRowAriaLabel}
                        />
                      </div>
                    </TableCell>
                    {effectiveColumns.map((col) => {
                      const truncateOn = col.truncate === true;
                      const stickyLeftPx = stickyOffsetsPx[col.key];
                      const isSticky = typeof stickyLeftPx === 'number';
                      const stickyRightPx = stickyRightOffsetsPx[col.key];
                      const isStickyRight = typeof stickyRightPx === 'number';
                      const alignClass = isStickyRight
                        ? 'text-right'
                        : col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : '';
                      const colWidthPx = hasAnyWidth
                        ? (resolveWidthPx(col, columnSizesPx, autoSizes) ??
                          resolveWidthPx(col, undefined, autoSizes))
                        : null;
                      const colWidthPct = evenWidthPctMap[col.key];
                      const fixedW = !hasAnyWidth ? fixedWidthPx(col) : null;
                      return (
                        <TableCell
                          key={col.key}
                          style={{
                            ...(isSticky
                              ? { position: 'sticky', left: stickyLeftPx }
                              : isStickyRight
                                ? { position: 'sticky', right: stickyRightPx }
                                : undefined),
                            ...(typeof colWidthPx === 'number'
                              ? { width: colWidthPx }
                              : typeof fixedW === 'number'
                                ? { width: fixedW }
                                : colWidthPct
                                  ? { width: colWidthPct }
                                  : undefined),
                          }}
                          className={cn(
                            'group-data-[state=selected]:bg-muted align-middle',
                            isLastRow && 'border-border/60 border-b',
                            alignClass,
                            truncateOn && 'overflow-hidden',
                            !isSticky &&
                              !isStickyRight &&
                              col.key === firstNonStickyKey &&
                              'pl-4',
                            isStickyRight && 'px-1 pr-0',
                            isSticky
                              ? [
                                  'bg-card sticky z-10 shadow-[inset_-1px_0_0_hsl(var(--border))]',
                                  'group-even:[background-color:color-mix(in_oklab,hsl(var(--muted))_3%,hsl(var(--card)))]',
                                  'group-hover:[background-color:color-mix(in_oklab,hsl(var(--muted))_30%,hsl(var(--card)))]',
                                ]
                              : isStickyRight
                                ? [
                                    'bg-card sticky z-10 shadow-[inset_1px_0_0_hsl(var(--border))]',
                                    'group-even:[background-color:color-mix(in_oklab,hsl(var(--muted))_3%,hsl(var(--card)))]',
                                    'group-hover:[background-color:color-mix(in_oklab,hsl(var(--muted))_30%,hsl(var(--card)))]',
                                  ]
                                : cn(
                                    'group-hover:bg-muted/30',
                                    col.key !== lastNonStickyRightKey &&
                                      'border-border/40 border-r',
                                  ),
                          )}
                          title={
                            truncateOn ? pickMeasureString(col, row) : undefined
                          }
                        >
                          <div
                            className={cn(
                              'w-full min-w-0',
                              truncateOn && 'truncate',
                              col.align === 'center' &&
                                'flex items-center justify-center',
                              isStickyRight && 'flex items-center justify-end',
                            )}
                          >
                            {col.render(row)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {isExpanded && renderExpandedRow && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={effectiveColumns.length + 2}
                        className={cn(
                          'bg-muted/30 p-3',
                          isLastRow && 'border-border border-b',
                        )}
                      >
                        {renderExpandedRow(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {pagination && <TablePaginationFooter pagination={pagination} />}
    </div>
  );
}

type PageItem = number | 'ellipsis';

function computePageWindow(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const visible = new Set<number>();
  visible.add(0);
  visible.add(total - 1);
  for (
    let i = Math.max(0, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    visible.add(i);
  }

  const sorted = [...visible].sort((a, b) => a - b);
  const result: PageItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const prev = i === 0 ? -1 : sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr - prev === 2) result.push(curr - 1);
    else if (curr - prev > 2) result.push('ellipsis');
    result.push(curr);
  }

  return result;
}

function TablePaginationFooter({
  pagination,
}: Readonly<{ pagination: DataTablePagination }>) {
  const {
    pageIndex,
    pageSize,
    totalRows,
    onPageIndexChange,
    onPageSizeChange,
    pageSizeOptions,
    label,
  } = pagination;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);
  const window = computePageWindow(pageIndex, pageCount);
  let ellipsisKey = 0;

  return (
    <div className="border-border bg-card flex shrink-0 items-center border-t px-3 py-2">
      <div className="flex-1">
        {label.showing && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {label.showing(from, to, totalRows)}
          </span>
        )}
      </div>

      <div className="flex flex-none items-center gap-0.5">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'h-7 w-7',
          )}
          onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex <= 0}
          aria-label={label.prev}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {window.map((item) => {
          if (item === 'ellipsis') {
            const key = `ellipsis-${ellipsisKey++}`;
            return (
              <span
                key={key}
                className="text-muted-foreground flex h-7 w-7 items-center justify-center"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </span>
            );
          }
          const isActive = item === pageIndex;
          return (
            <button
              key={item}
              type="button"
              className={cn(
                buttonVariants({
                  variant: isActive ? 'secondary' : 'ghost',
                  size: 'icon',
                }),
                'h-7 w-7 text-xs tabular-nums',
              )}
              onClick={() => onPageIndexChange(item)}
              aria-current={isActive ? 'page' : undefined}
            >
              {item + 1}
            </button>
          );
        })}

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'h-7 w-7',
          )}
          onClick={() =>
            onPageIndexChange(Math.min(pageCount - 1, pageIndex + 1))
          }
          disabled={pageIndex >= pageCount - 1}
          aria-label={label.next}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {onPageSizeChange && pageSizeOptions && label.rowsPerPage && (
          <>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                onPageSizeChange(Number(v));
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              {label.rowsPerPage}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function HeaderContent<T>({
  col,
}: Readonly<{
  col: AdvancedColumn<T>;
}>) {
  return (
    <span className="inline-flex min-w-0 items-center">
      <span className="truncate">{col.label}</span>
    </span>
  );
}

function SortButton({
  colKey,
  sort,
  onToggle,
}: Readonly<{
  colKey: string;
  sort: SortState | null;
  onToggle: (key: string) => void;
}>) {
  const isSorted = sort?.key === colKey;
  const dir = isSorted ? sort!.direction : null;
  return (
    <button
      type="button"
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
        isSorted && 'text-foreground',
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(colKey);
      }}
      aria-label={colKey}
    >
      {dir === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : dir === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
      )}
    </button>
  );
}

function SortableHeaderCell({
  colKey,
  style,
  reorderColumnAriaLabel,
  className,
  canResize,
  resizeColumnAriaLabel,
  onResize,
  minWidthPx,
  maxWidthPx,
  children,
}: Readonly<{
  colKey: string;
  style?: React.CSSProperties;
  reorderColumnAriaLabel?: string;
  className?: string;
  canResize: boolean;
  resizeColumnAriaLabel?: string;
  onResize: (nextPx: number) => void;
  minWidthPx?: number;
  maxWidthPx?: number;
  children: React.ReactNode;
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: colKey });

  const dndStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={dndStyle}
      className={cn(
        'text-muted-foreground bg-card border-border relative sticky top-0 z-10 cursor-grab border-b text-sm font-semibold select-none active:cursor-grabbing',
        className,
      )}
      {...attributes}
      {...listeners}
      aria-label={reorderColumnAriaLabel ?? colKey}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1">{children}</span>
      </div>
      {canResize && (
        <ResizeHandle
          ariaLabel={resizeColumnAriaLabel ?? colKey}
          getWidthPx={() => (style?.width as number | undefined) ?? 220}
          minWidthPx={minWidthPx}
          maxWidthPx={maxWidthPx}
          onResize={onResize}
        />
      )}
    </TableHead>
  );
}

function headerStyle<T>(
  col: AdvancedColumn<T>,
  columnSizesPx: Record<string, number> | undefined,
  autoSizes: Record<string, number> | undefined,
  evenWidthPctMap?: Record<string, string>,
): React.CSSProperties | undefined {
  const w = resolveWidthPx(col, columnSizesPx, autoSizes);
  if (col.grow) {
    const minW = w ?? fixedWidthPx(col) ?? col.minWidthPx;
    if (minW == null) return undefined;
    return w != null ? { width: w, minWidth: minW } : { minWidth: minW };
  }
  if (w != null) return { width: w };
  const fixed = fixedWidthPx(col);
  if (fixed != null) return { width: fixed };
  const pct = evenWidthPctMap?.[col.key];
  if (pct) return { width: pct };
  return col.width ? { width: col.width } : undefined;
}

function fixedWidthPx<T>(col: AdvancedColumn<T>): number | null {
  if (
    typeof col.minWidthPx === 'number' &&
    typeof col.maxWidthPx === 'number' &&
    Number.isFinite(col.minWidthPx) &&
    Number.isFinite(col.maxWidthPx) &&
    col.minWidthPx === col.maxWidthPx
  ) {
    return col.minWidthPx;
  }
  if (col.width) {
    const m = /^(\d+)px$/.exec(col.width.trim());
    if (m) return Number(m[1]);
  }
  return null;
}

function resolveWidthPx<T>(
  col: AdvancedColumn<T>,
  columnSizesPx: Record<string, number> | undefined,
  autoSizes: Record<string, number> | undefined,
): number | null {
  // Fixed-size columns must remain fixed even if a persisted size exists.
  const fixed = fixedWidthPx(col);
  if (fixed != null) return fixed;

  const stored = columnSizesPx?.[col.key];
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return clamp(stored, col.minWidthPx, col.maxWidthPx);
  }
  if (col.width) {
    const m = /^(\d+)px$/.exec(col.width.trim());
    if (m) return clamp(Number(m[1]), col.minWidthPx, col.maxWidthPx);
  }
  const auto = autoSizes?.[col.key];
  if (typeof auto === 'number' && Number.isFinite(auto)) {
    return clamp(auto, col.minWidthPx, col.maxWidthPx);
  }
  return null;
}

function pickMeasureString<T>(
  col: AdvancedColumn<T>,
  row: T,
): string | undefined {
  if (col.measureCell) return col.measureCell(row);
  if (col.exportCell) return col.exportCell(row);
  if (col.sortAccessor) {
    const v = col.sortAccessor(row);
    if (v == null) return undefined;
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function clamp(n: number, min?: number, max?: number): number {
  const a = typeof min === 'number' ? Math.max(n, min) : n;
  return typeof max === 'number' ? Math.min(a, max) : a;
}

function estimateHeaderMinWidthPx<T>(col: AdvancedColumn<T>): number {
  const label = typeof col.label === 'string' ? col.label : col.key;
  const textPx = Math.ceil(label.length * 7);
  const padding = 16; // px-2 each side from shadcn TableHead
  const sortBtn = col.sortable ? 32 : 0; // gap-1 (4px) + w-7 (28px)
  return textPx + padding + sortBtn + 8; // 8px buffer
}

function clampHeaderMinWidthPx<T>(col: AdvancedColumn<T>): number {
  const estimated = estimateHeaderMinWidthPx(col);
  const withColMin = Math.max(estimated, col.minWidthPx ?? 0);
  return typeof col.maxWidthPx === 'number'
    ? Math.min(withColMin, col.maxWidthPx)
    : withColMin;
}

function ResizeHandle({
  ariaLabel,
  getWidthPx,
  minWidthPx,
  maxWidthPx,
  onResize,
}: Readonly<{
  ariaLabel: string;
  getWidthPx: () => number;
  minWidthPx?: number;
  maxWidthPx?: number;
  onResize: (nextPx: number) => void;
}>) {
  const startX = useRef<number | null>(null);
  const startW = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startW.current = getWidthPx();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current == null || startW.current == null) return;
    const dx = e.clientX - startX.current;
    const next = clamp(Math.round(startW.current + dx), minWidthPx, maxWidthPx);
    onResize(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = null;
    startW.current = null;
    try {
      (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="absolute top-0 z-[2] h-full w-[6px] cursor-col-resize bg-transparent p-0 select-none focus:outline-none"
      style={{ right: '-3px', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
