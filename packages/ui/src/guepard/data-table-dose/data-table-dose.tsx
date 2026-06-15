'use client';

/**
 * Dose-style DataTable — ported as-is for Storybook evaluation only.
 * NOT exported from package.json. Do not import from app/feature code.
 * Prefer `@guepard/ui/data-table-advanced` for production tables.
 */

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

import { Button } from '../../shadcn/button';
import { Checkbox } from '../../shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shadcn/select';
import { cn } from '../../lib/utils';

export type DoseDataTableRow = { id: number; [key: string]: unknown };

export type DoseDataTableProps<T extends DoseDataTableRow> = {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  selectable?: boolean;
  sortable?: boolean;
  title?: string;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onRowSelect?: (rowId: number, selected: boolean) => void;
  selectedRows?: Set<number>;
  onSelectedRowsChange?: (selectedRows: Set<number>) => void;
  expandedRows?: Set<number>;
  onExpandedRowsChange?: (expandedRows: Set<number>) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  isRowExpandable?: (row: T) => boolean;
  activeRowId?: number;
  /** Labels — callers pass i18n'd strings. No hardcoded English beyond defaults. */
  labels?: {
    loading?: string;
    noData?: string;
    perPage?: string;
    previousPage?: string;
    nextPage?: string;
    selectAll?: string;
  };
};

export function DoseDataTable<T extends DoseDataTableRow>({
  data,
  columns,
  loading = false,
  selectable = false,
  sortable = true,
  title = 'Data Table',
  pagination = true,
  pageSize = 10,
  onRowClick,
  onRowSelect,
  selectedRows: externalSelectedRows,
  onSelectedRowsChange,
  expandedRows: externalExpandedRows,
  onExpandedRowsChange,
  renderExpandedRow,
  isRowExpandable,
  activeRowId,
  labels,
}: DoseDataTableProps<T>) {
  const l = {
    loading: labels?.loading ?? 'Loading...',
    noData: labels?.noData ?? 'No data available',
    perPage: labels?.perPage ?? 'per page',
    previousPage: labels?.previousPage ?? 'Previous page',
    nextPage: labels?.nextPage ?? 'Next page',
    selectAll: labels?.selectAll ?? 'Select all',
  };

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<number>>(
    new Set(),
  );
  const [internalExpandedRows, setInternalExpandedRows] = useState<Set<number>>(
    new Set(),
  );

  const expandedRows = externalExpandedRows ?? internalExpandedRows;
  const setExpandedRows = onExpandedRowsChange ?? setInternalExpandedRows;

  const [currentPageSize, setCurrentPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`datatable-page-size-${title}`);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
    return pageSize;
  });
  const isInitialMount = useRef(true);

  const selectedRows = externalSelectedRows ?? internalSelectedRows;
  const setSelectedRows = onSelectedRowsChange ?? setInternalSelectedRows;
  const [visibleColumns] = useState<Set<string>>(() => {
    const defaults = new Set(
      columns.map(
        (col, index) =>
          col.id ??
          (col as { accessorKey?: string }).accessorKey ??
          `col-${index}`,
      ),
    );
    if (typeof window === 'undefined') return defaults;
    const saved = localStorage.getItem(`datatable-columns-${title}`);
    if (!saved) return defaults;
    try {
      return new Set(JSON.parse(saved) as string[]);
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const allCols = new Set(
      columns.map(
        (col, index) =>
          col.id ??
          (col as { accessorKey?: string }).accessorKey ??
          `col-${index}`,
      ),
    );
    if (visibleColumns.size < allCols.size) {
      localStorage.setItem(
        `datatable-columns-${title}`,
        JSON.stringify(Array.from(visibleColumns)),
      );
    } else {
      localStorage.removeItem(`datatable-columns-${title}`);
    }
  }, [visibleColumns, title, columns]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `datatable-page-size-${title}`,
        String(currentPageSize),
      );
    }
  }, [currentPageSize, title]);

  const getNestedValue = (obj: unknown, path: string): unknown => {
    if (!obj || !path) return undefined;
    return path
      .split('.')
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === 'object'
            ? (current as Record<string, unknown>)[key]
            : undefined,
        obj,
      );
  };

  const sortedData = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    if (!sortColumn) return arr;
    return [...arr].sort((a, b) => {
      const av = getNestedValue(a, sortColumn);
      const bv = getNestedValue(b, sortColumn);
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bv === undefined) return sortDirection === 'asc' ? -1 : 1;
      if ((av as number | string) < (bv as number | string))
        return sortDirection === 'asc' ? -1 : 1;
      if ((av as number | string) > (bv as number | string))
        return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * currentPageSize;
    return sortedData.slice(start, start + currentPageSize);
  }, [sortedData, currentPage, currentPageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / currentPageSize);

  const handleSort = (key: string) => {
    if (!key) return;
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const ids = paginatedData
      .map((row) => (typeof row?.id === 'number' ? row.id : undefined))
      .filter((id): id is number => id !== undefined);

    const next = new Set(selectedRows);
    for (const id of ids) {
      if (checked) next.add(id);
      else next.delete(id);
      onRowSelect?.(id, checked);
    }
    setSelectedRows(next);
  };

  const handleSelectRow = (rowId: number, checked: boolean) => {
    const next = new Set(selectedRows);
    if (checked) next.add(rowId);
    else next.delete(rowId);
    setSelectedRows(next);
    onRowSelect?.(rowId, checked);
  };

  const toggleRowExpansion = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(expandedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedRows(next);
  };

  const allRowIds = useMemo(
    () =>
      paginatedData
        .map((row) => (typeof row?.id === 'number' ? row.id : undefined))
        .filter((id): id is number => id !== undefined),
    [paginatedData],
  );

  const isAllSelected =
    allRowIds.length > 0 && allRowIds.every((id) => selectedRows.has(id));

  const getVisibleColumns = () =>
    columns.filter((col, index) => {
      const key =
        col.id ??
        (col as { accessorKey?: string }).accessorKey ??
        `col-${index}`;
      if ((col as { enableHiding?: boolean }).enableHiding === false)
        return true;
      if (key === 'select') return false;
      return visibleColumns.has(key);
    });

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2">{l.loading}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max">
          <thead className="bg-muted/50 border-border sticky top-0 z-[1] border-b backdrop-blur-md">
            <tr>
              {renderExpandedRow && (
                <th className="text-muted-foreground w-10 px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                  <span className="sr-only">Expand</span>
                </th>
              )}
              {selectable && (
                <th className="text-muted-foreground relative px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                    className="border-border"
                    aria-label={l.selectAll}
                  />
                </th>
              )}
              {getVisibleColumns().map((column, index) => {
                const key =
                  column.id ??
                  (column as { accessorKey?: string }).accessorKey ??
                  `col-${index}`;
                const accessor =
                  (column as { accessorKey?: string }).accessorKey ??
                  (column.id as string);
                return (
                  <th
                    key={key}
                    className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {typeof column.header === 'function'
                          ? column.header({
                              column: {
                                toggleSorting: () => handleSort(accessor),
                              } as unknown as Parameters<
                                Extract<
                                  ColumnDef<T>['header'],
                                  (...args: unknown[]) => unknown
                                >
                              >[0]['column'],
                            } as Parameters<
                              Extract<
                                ColumnDef<T>['header'],
                                (...args: unknown[]) => unknown
                              >
                            >[0])
                          : (column.header as ReactNode)}
                      </span>
                      {sortable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleSort(accessor)}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-card divide-border divide-y">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    getVisibleColumns().length +
                    (selectable ? 1 : 0) +
                    (renderExpandedRow ? 1 : 0)
                  }
                  className="text-muted-foreground px-4 py-8 text-center text-sm"
                >
                  {l.noData}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowId = typeof row?.id === 'number' ? row.id : undefined;
                const isExpanded = expandedRows.has(rowIndex);
                const canExpand =
                  renderExpandedRow &&
                  (isRowExpandable ? isRowExpandable(row) : true);
                const isSelected =
                  rowId !== undefined && selectedRows.has(rowId);

                return (
                  <Fragment
                    key={
                      rowId !== undefined
                        ? `row-${rowId}`
                        : `row-idx-${rowIndex}`
                    }
                  >
                    <tr
                      className={cn(
                        'cursor-pointer transition-colors',
                        rowId === activeRowId
                          ? 'bg-primary/10 hover:bg-primary/15'
                          : 'hover:bg-muted/50',
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {renderExpandedRow && (
                        <td className="px-2 py-2">
                          {canExpand ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => toggleRowExpansion(rowIndex, e)}
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
                        </td>
                      )}
                      {selectable && (
                        <td className="relative px-2 py-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) => {
                              if (rowId !== undefined)
                                handleSelectRow(rowId, Boolean(v));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="border-border"
                          />
                        </td>
                      )}
                      {getVisibleColumns().map((column, colIndex) => {
                        const key =
                          column.id ??
                          (column as { accessorKey?: string }).accessorKey ??
                          `col-${colIndex}`;
                        const accessor =
                          (column as { accessorKey?: string }).accessorKey ??
                          (column.id as string);
                        return (
                          <td
                            key={key}
                            className="text-foreground px-2 py-2 text-sm"
                          >
                            {typeof column.cell === 'function' ? (
                              column.cell({
                                row: {
                                  original: row,
                                  getValue: (k: string) =>
                                    getNestedValue(row, k),
                                  getIsSelected: () =>
                                    rowId !== undefined &&
                                    selectedRows.has(rowId),
                                  toggleSelected: (v: boolean) => {
                                    if (rowId !== undefined)
                                      handleSelectRow(rowId, v);
                                  },
                                } as unknown as Parameters<
                                  Extract<
                                    ColumnDef<T>['cell'],
                                    (...args: unknown[]) => unknown
                                  >
                                >[0]['row'],
                              } as Parameters<
                                Extract<
                                  ColumnDef<T>['cell'],
                                  (...args: unknown[]) => unknown
                                >
                              >[0])
                            ) : (
                              <span>
                                {accessor
                                  ? String(
                                      getNestedValue(row, accessor) ?? 'N/A',
                                    )
                                  : 'N/A'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && renderExpandedRow && (
                      <tr key={`${rowIndex}-expanded`}>
                        <td
                          colSpan={
                            getVisibleColumns().length +
                            (selectable ? 1 : 0) +
                            1
                          }
                          className="bg-muted/30 border-border border-b px-2 py-2"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="bg-muted/30 border-border flex shrink-0 items-center justify-between border-t px-3 py-1.5 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {sortedData.length === 0
                ? 0
                : (currentPage - 1) * currentPageSize + 1}
              –{Math.min(currentPage * currentPageSize, sortedData.length)} of{' '}
              {sortedData.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{l.perPage}</span>
              <Select
                value={String(currentPageSize)}
                onValueChange={(v) => {
                  setCurrentPageSize(parseInt(v, 10));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="border-border/60 h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label={l.previousPage}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center gap-0.5">
                {(() => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage <= 3) {
                      pages.push(2, 3, 4, '...', totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(
                        '...',
                        totalPages - 3,
                        totalPages - 2,
                        totalPages - 1,
                        totalPages,
                      );
                    } else {
                      pages.push(
                        '...',
                        currentPage - 1,
                        currentPage,
                        currentPage + 1,
                        '...',
                        totalPages,
                      );
                    }
                  }
                  return pages.map((page, idx) => {
                    if (page === '...')
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="text-muted-foreground px-1"
                        >
                          …
                        </span>
                      );
                    const n = page as number;
                    return (
                      <Button
                        key={n}
                        variant={currentPage === n ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 min-w-7 px-2 text-xs"
                        onClick={() => setCurrentPage(n)}
                      >
                        {n}
                      </Button>
                    );
                  });
                })()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                aria-label={l.nextPage}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
