import type { AdvancedColumn } from './types';

export type AutoFitOptions = {
  /** Average px per char at the body font size. */
  charPx?: number;
  /** Header vs. cell padding + sort/grip affordance. */
  paddingPx?: number;
  /** Cap the sample size for large datasets. */
  sampleSize?: number;
  /** Global default min width (used when column doesn't specify one). */
  defaultMinPx?: number;
  /** Global default max width (used when column doesn't specify one). */
  defaultMaxPx?: number;
};

function pickMeasure<T>(col: AdvancedColumn<T>, row: T): string {
  if (col.measureCell) return col.measureCell(row);
  if (col.exportCell) return col.exportCell(row);
  if (col.sortAccessor) {
    const v = col.sortAccessor(row);
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function labelLength<T>(col: AdvancedColumn<T>): number {
  if (typeof col.label === 'string') return col.label.length;
  if (typeof col.label === 'number') return String(col.label).length;
  return 8;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Heuristic content-based width: longest cell string + header label length,
 * converted to px and clamped by the column's (or global) min/max. Cheap,
 * synchronous, good enough for most tabular data without a canvas measurer.
 */
export function computeAutoColumnSizesPx<T>(
  rows: T[],
  columns: AdvancedColumn<T>[],
  opts: AutoFitOptions = {},
): Record<string, number> {
  const charPx = opts.charPx ?? 7.3;
  const paddingPx = opts.paddingPx ?? 40;
  const sampleSize = opts.sampleSize ?? 200;
  const defMin = opts.defaultMinPx ?? 80;
  const defMax = opts.defaultMaxPx ?? 520;

  const sample = rows.length > sampleSize ? rows.slice(0, sampleSize) : rows;

  const sizes: Record<string, number> = {};
  for (const col of columns) {
    let longest = labelLength(col);
    for (const row of sample) {
      const str = pickMeasure(col, row);
      if (str.length > longest) longest = str.length;
    }
    const min = col.minWidthPx ?? defMin;
    const max = col.maxWidthPx ?? defMax;
    const px = Math.round(longest * charPx + paddingPx);
    sizes[col.key] = clamp(px, min, max);
  }
  return sizes;
}
