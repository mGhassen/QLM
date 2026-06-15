import { useEffect, useMemo } from 'react';

export type ColumnVisibilityDefault = Readonly<{
  key: string;
  defaultHidden?: boolean;
}>;

/**
 * Column-visibility bootstrap and derived visibility map.
 */
export function useTableVisibility(
  columns: ReadonlyArray<ColumnVisibilityDefault>,
  visibleColumns: Record<string, boolean>,
  onVisibleColumnsChange: (v: Record<string, boolean>) => void,
): { visibleMap: Record<string, boolean> } {
  useEffect(() => {
    let changed = false;
    const next: Record<string, boolean> = { ...visibleColumns };
    for (const c of columns) {
      if (next[c.key] === undefined) {
        next[c.key] = !c.defaultHidden;
        changed = true;
      }
    }
    if (changed) onVisibleColumnsChange(next);
  }, [columns, visibleColumns, onVisibleColumnsChange]);

  const visibleMap = useMemo(() => {
    const next: Record<string, boolean> = { ...visibleColumns };
    for (const c of columns) {
      if (next[c.key] === undefined) next[c.key] = !c.defaultHidden;
    }
    return next;
  }, [columns, visibleColumns]);

  return { visibleMap };
}
