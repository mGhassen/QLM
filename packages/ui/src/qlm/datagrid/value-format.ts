import type { ColumnHeader } from '@qlm/domain/entities';
import {
  formatJsonPreview,
  formatTooltipValue,
  truncateEnd,
} from '../../lib/utils/value-preview';

export type CellFormatOptions = {
  /** Target max characters for the in-grid preview. */
  maxPreviewChars?: number;
  /** Max characters allowed in tooltip content (safety cap). */
  maxTooltipChars?: number;
};

const DEFAULT_MAX_PREVIEW_CHARS = 32;
const DEFAULT_MAX_TOOLTIP_CHARS = 20_000;

function formatDate(date: Date): string {
  return (
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function isISOString(value: string): boolean {
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value);
}

export function isDateTimeColumn(column: ColumnHeader): boolean {
  const name = column.name.toLowerCase();
  const type = (column.type || column.originalType || '').toLowerCase();

  if (
    column.type === 'date' ||
    column.type === 'datetime' ||
    column.type === 'timestamp' ||
    column.type === 'time'
  ) {
    return true;
  }

  return (
    name.includes('date') ||
    name.includes('time') ||
    name.includes('timestamp') ||
    name.includes('created_at') ||
    name.includes('updated_at') ||
    type.includes('date') ||
    type.includes('time') ||
    type.includes('timestamp')
  );
}

function isJsonColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return type === 'json' || type === 'jsonb' || type.includes('json');
}

/**
 * Full string representation used for CSV/export, column-width sampling, and
 * tooltip fallback. Intended to be stable and lossless-ish.
 */
export function formatCellValue(value: unknown, column: ColumnHeader): string {
  if (value === null || value === undefined) return 'null';

  if (value instanceof Date) return formatDate(value);

  if (typeof value === 'string') {
    if (isISOString(value) || isDateTimeColumn(column)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return formatDate(date);
    }
    return value;
  }

  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '✓' : '✗';

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function formatCellForGrid(
  value: unknown,
  column: ColumnHeader,
  opts: CellFormatOptions = {},
): {
  full: string;
  preview: string;
  tooltip: string | null;
  isNull: boolean;
  isTruncatedByValue: boolean;
} {
  const maxPreviewChars = opts.maxPreviewChars ?? DEFAULT_MAX_PREVIEW_CHARS;
  const maxTooltipChars = opts.maxTooltipChars ?? DEFAULT_MAX_TOOLTIP_CHARS;

  const isNull = value === null || value === undefined;
  const full = formatCellValue(value, column);

  const isJsonLike =
    (typeof value === 'object' && value !== null) || isJsonColumn(column);

  const rawPreview = isNull
    ? 'null'
    : isJsonLike
      ? formatJsonPreview(value)
      : full;
  const preview = truncateEnd(rawPreview, maxPreviewChars);
  const isTruncatedByValue = rawPreview.length > maxPreviewChars;

  // For objects/JSON we almost always want a hover preview, even if the short
  // preview isn't truncated (because the value is still "heavy").
  const tooltip =
    isJsonLike || isTruncatedByValue
      ? formatTooltipValue(value, full, maxTooltipChars)
      : null;

  return { full, preview, tooltip, isNull, isTruncatedByValue };
}
