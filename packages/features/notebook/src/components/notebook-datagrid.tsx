'use client';

import { useCallback } from 'react';

import type {
  ColumnHeader,
  DatasourceResultSet,
  DatasourceRow,
} from '@qlm/domain/entities';
import { DataGrid } from '@qlm/ui/qlm/datagrid';
import { cn } from '@qlm/ui/utils';

interface NotebookDataGridProps {
  result: DatasourceResultSet;
  className?: string;
  pageSize?: number;
  /** Filename (without extension) used when the user clicks Export CSV. */
  exportFileName?: string;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatCellForCsv(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function rowsToCsv(columns: ColumnHeader[], rows: DatasourceRow[]): string {
  const header = columns
    .map((col) => csvEscape(col.displayName || col.name))
    .join(',');
  const body = rows.map((row) =>
    columns.map((col) => csvEscape(formatCellForCsv(row[col.name]))).join(','),
  );
  return [header, ...body].join('\n');
}

function triggerDownload(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Thin wrapper around the virtualized `DataGrid` from
 * `@qlm/ui/qlm/datagrid`. The notebook always renders query
 * results through this wrapper so the row/column shape stays
 * consistent with the `DatasourceResultSet` domain entity.
 *
 * Wires `onDownloadCSV` and `onCopyPage` so the grid's header strip
 * shows the export and copy buttons. The grid's built-in copy
 * fallback only copies the current page; we provide a wrapper-level
 * handler that copies the full result set.
 */
export function NotebookDataGrid({
  result,
  className,
  pageSize = 50,
  exportFileName = 'query-result',
}: NotebookDataGridProps) {
  const { rows, columns, stat } = result;

  const handleDownloadCsv = useCallback(() => {
    if (rows.length === 0) return;
    const csv = rowsToCsv(columns, rows);
    triggerDownload(`${exportFileName}.csv`, csv);
  }, [columns, rows, exportFileName]);

  const handleCopyPage = useCallback(() => {
    if (rows.length === 0) return;
    const csv = rowsToCsv(columns, rows);
    void navigator.clipboard.writeText(csv);
  }, [columns, rows]);

  return (
    <DataGrid
      className={cn('h-full', className)}
      columns={columns}
      rows={rows}
      stat={stat}
      pageSize={pageSize}
      onDownloadCSV={handleDownloadCsv}
      onCopyPage={handleCopyPage}
    />
  );
}
