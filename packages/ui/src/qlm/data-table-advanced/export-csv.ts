import type { AdvancedColumn } from './types';

function toCell<T>(col: AdvancedColumn<T>, row: T): string {
  if (col.exportCell) return col.exportCell(row);
  if (col.sortAccessor) {
    const v = col.sortAccessor(row);
    if (v instanceof Date) return v.toISOString();
    return v == null ? '' : String(v);
  }
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

/** Escape a value per RFC 4180: wrap in quotes, double embedded quotes. */
function escape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function exportRowsToCsv<T>({
  rows,
  columns,
  filename,
}: {
  rows: T[];
  columns: AdvancedColumn<T>[];
  filename: string;
}): void {
  const exportable = columns.filter(
    (c) => c.key !== 'actions' && c.key !== 'select',
  );
  const header = exportable.map((c) =>
    escape(typeof c.label === 'string' ? c.label : c.key),
  );
  const body = rows.map((row) => exportable.map((c) => escape(toCell(c, row))));
  const csv = [header.join(','), ...body.map((line) => line.join(','))].join(
    '\r\n',
  );

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
