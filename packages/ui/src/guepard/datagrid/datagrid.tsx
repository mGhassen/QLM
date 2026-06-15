'use client';

import * as React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import type { ColumnHeader, DatasourceRow } from '@guepard/domain/entities';
import { cn } from '../../lib/utils';
import { DataGridCell } from './datagrid-cell';
import { formatCellValue } from './value-format';
import { DataGridRowSheet } from './datagrid-row-sheet';
import { useColumnWidths } from './use-column-widths';
import { DataGridHeader } from './datagrid-header';
import { Checkbox } from '../../shadcn/checkbox';

export interface DataGridProps {
  columns: ColumnHeader[];
  rows: DatasourceRow[];
  className?: string;
  pageSize?: number;
  stat?: {
    rowsRead?: number | null;
    queryDurationMs?: number | null;
  };
  showRowSelection?: boolean;
  showHeader?: boolean;
  title?: string;
  onDownloadCSV?: () => void;
  onCopyPage?: () => void;
}

function rowsToCSV(
  columns: ColumnHeader[],
  rows: DatasourceRow[],
  formatValue: (value: unknown, column: ColumnHeader) => string,
): string {
  const escape = (s: string) =>
    s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  const header = columns.map((c) => escape(c.displayName || c.name)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((col) => escape(formatValue(row[col.name], col))).join(','),
  );
  return [header, ...dataRows].join('\n');
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function DataGrid({
  columns,
  rows,
  className,
  pageSize,
  stat,
  showRowSelection = true,
  showHeader = true,
  title,
  onDownloadCSV,
  onCopyPage,
}: DataGridProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<DatasourceRow | null>(
    null,
  );
  const [selectedRowIndex, setSelectedRowIndex] = React.useState(0);

  const columnWidths = useColumnWidths(columns, rows);
  const selectionColWidth = 36;
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<number>>(
    () => new Set(),
  );

  const effectivePageSize = pageSize || rows.length;
  const totalPages = Math.ceil(rows.length / effectivePageSize);
  const page = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;
  const startIndex = (page - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const currentRows = pageSize ? rows.slice(startIndex, endIndex) : rows;

  // Prefer rows.length when stat.rowsRead is wrong (e.g. some drivers report 1)
  const totalRows = Math.max(stat?.rowsRead ?? 0, rows.length) || rows.length;
  const duration = formatDuration(stat?.queryDurationMs);

  const prevRowsLengthRef = React.useRef(rows.length);
  React.useEffect(() => {
    if (prevRowsLengthRef.current !== rows.length) {
      prevRowsLengthRef.current = rows.length;
      if (currentPage > totalPages && totalPages > 0) {
        queueMicrotask(() => {
          setCurrentPage(1);
        });
      }
    }
  }, [rows.length, currentPage, totalPages]);

  if (!columns.length) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No columns to display
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data to display
      </div>
    );
  }

  const handleCopyPage =
    onCopyPage ??
    (() => {
      const csv = rowsToCSV(columns, currentRows, formatCellValue);
      void navigator.clipboard.writeText(csv);
    });

  const showCustomHeader =
    showHeader && (title || stat || onDownloadCSV || onCopyPage);

  const currentRowIds = currentRows.map((_, i) => startIndex + i);
  let currentSelectedCount = 0;
  for (const id of currentRowIds) {
    if (selectedRowIds.has(id)) currentSelectedCount++;
  }

  const allCurrentSelected =
    currentRowIds.length > 0 && currentSelectedCount === currentRowIds.length;
  const someCurrentSelected =
    currentSelectedCount > 0 && currentSelectedCount < currentRowIds.length;

  const toggleAllCurrent = (checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of currentRowIds) next.add(id);
      } else {
        for (const id of currentRowIds) next.delete(id);
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        'bg-background border-border/80 flex h-full flex-col overflow-hidden rounded-md border',
        className,
      )}
    >
      {showCustomHeader && (
        <DataGridHeader
          title={title}
          totalRows={totalRows}
          duration={duration}
          onDownloadCSV={onDownloadCSV}
          onCopyPage={handleCopyPage}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <TableVirtuoso
          data={currentRows}
          computeItemKey={(index) => `row-${startIndex + index}`}
          components={{
            Table: ({ style, ...props }) => (
              <table
                {...props}
                style={{
                  ...style,
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                }}
                className="w-full caption-bottom text-sm"
              />
            ),
            TableHead: React.forwardRef(function DataGridTableHead(
              {
                style,
                ...props
              }: React.HTMLAttributes<HTMLTableSectionElement>,
              ref: React.Ref<HTMLTableSectionElement>,
            ) {
              return (
                <thead
                  ref={ref}
                  {...props}
                  style={{
                    ...style,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }}
                  className="bg-background [&_tr]:border-border/80 [&_tr]:border-b"
                />
              );
            }),
            TableBody: React.forwardRef(function DataGridTableBody(
              props: React.HTMLAttributes<HTMLTableSectionElement>,
              ref: React.Ref<HTMLTableSectionElement>,
            ) {
              return (
                <tbody
                  ref={ref}
                  {...props}
                  className="[&_tr:last-child]:border-0"
                />
              );
            }),
            TableRow: ({
              item,
              ...props
            }: React.HTMLAttributes<HTMLTableRowElement> & {
              item?: DatasourceRow;
            }) => {
              const index = item ? currentRows.indexOf(item) : -1;
              const rowId = index >= 0 ? startIndex + index : -1;
              const isSelected = rowId >= 0 && selectedRowIds.has(rowId);
              const handleDoubleClick = () => {
                if (item) {
                  setSelectedRow(item);
                  setSelectedRowIndex(rowId >= 0 ? rowId : 0);
                  setSheetOpen(true);
                }
              };
              return (
                <tr
                  {...props}
                  className={cn(
                    'group border-border/70 cursor-pointer border-b bg-transparent transition-colors',
                    isSelected
                      ? 'bg-accent/40 hover:bg-accent/45'
                      : 'hover:bg-muted/40',
                  )}
                  onDoubleClick={handleDoubleClick}
                />
              );
            },
          }}
          fixedHeaderContent={() => (
            <tr>
              {showRowSelection && (
                <th
                  className="border-border bg-background sticky left-0 z-30 h-10 border-r px-2 text-left align-middle"
                  style={{
                    width: selectionColWidth,
                    minWidth: selectionColWidth,
                    maxWidth: selectionColWidth,
                  }}
                >
                  <Checkbox
                    aria-label="Select all rows on page"
                    checked={
                      allCurrentSelected
                        ? true
                        : someCurrentSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(v) => toggleAllCurrent(v === true)}
                  />
                </th>
              )}
              {columns.map((column, colIndex) => {
                const isLastColumn = colIndex === columns.length - 1;
                const isPrimaryKey =
                  typeof column.name === 'string' &&
                  column.name.toLowerCase() === 'id';
                const stickyLeft = showRowSelection ? selectionColWidth : 0;
                return (
                  <th
                    key={column.name}
                    className={cn(
                      'bg-background text-foreground/80 h-10 px-2 text-left align-middle font-semibold',
                      isPrimaryKey && 'sticky z-20',
                      !isLastColumn && 'border-border border-r',
                    )}
                    style={{
                      width: columnWidths[colIndex],
                      ...(isPrimaryKey ? { left: stickyLeft } : null),
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">
                        {column.displayName || column.name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          )}
          itemContent={(index, row) => (
            <>
              {(() => {
                const rowId = startIndex + index;
                const isSelected = selectedRowIds.has(rowId);
                const baseCellBg = isSelected
                  ? 'bg-accent/40'
                  : 'bg-background';
                const hoverCellBg = isSelected
                  ? 'group-hover:bg-accent/45'
                  : 'group-hover:bg-muted/40';

                return (
                  <>
                    {showRowSelection && (
                      <td
                        className={cn(
                          'border-border sticky left-0 z-20 border-r p-2 align-middle transition-colors',
                          baseCellBg,
                          hoverCellBg,
                        )}
                        style={{
                          width: selectionColWidth,
                          minWidth: selectionColWidth,
                          maxWidth: selectionColWidth,
                        }}
                      >
                        <Checkbox
                          aria-label={`Select row ${startIndex + index + 1}`}
                          checked={isSelected}
                          onCheckedChange={(v) => {
                            const id = rowId;
                            setSelectedRowIds((prev) => {
                              const next = new Set(prev);
                              if (v === true) next.add(id);
                              else next.delete(id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {columns.map((column, colIndex) => {
                      const value = row[column.name];
                      const isPrimaryKey =
                        typeof column.name === 'string' &&
                        column.name.toLowerCase() === 'id';
                      const stickyLeft = showRowSelection
                        ? selectionColWidth
                        : 0;
                      return (
                        <DataGridCell
                          key={column.name}
                          value={value}
                          column={column}
                          style={{
                            width: columnWidths[colIndex],
                            ...(isPrimaryKey ? { left: stickyLeft } : null),
                          }}
                          className={cn(
                            baseCellBg,
                            hoverCellBg,
                            isPrimaryKey && 'sticky z-10',
                          )}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
        />
      </div>

      <DataGridRowSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        row={selectedRow}
        columns={columns}
        rowIndex={selectedRowIndex}
      />

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t py-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-muted-foreground hover:bg-muted disabled:text-muted-foreground/40 h-7 w-7 cursor-pointer rounded disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-muted-foreground min-w-[60px] text-center text-xs tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-muted-foreground hover:bg-muted disabled:text-muted-foreground/40 h-7 w-7 cursor-pointer rounded disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
