import { useCallback, useMemo, useRef } from 'react';

export type UseBulkSelectionOptions<T> = Readonly<{
  selected: Set<string>;
  onSelectedChange: (
    next: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
  pagedRows: readonly T[];
  allRows?: readonly T[];
  getId: (row: T) => string;
}>;

/**
 * Generic bulk-selection helper for table/grid list views.
 *
 * The hook is stateless with respect to the selection set: the caller
 * owns the `selected` Set and provides `onSelectedChange`. Internally
 * the hook tracks a shift-range anchor ref so consecutive shift-clicks
 * select inclusive ranges without scattering state across the page.
 */
export function useBulkSelection<T>(opts: UseBulkSelectionOptions<T>): {
  selectedRows: T[];
  toggle: (
    id: string,
    options?: { shiftKey?: boolean; checked?: boolean },
  ) => void;
  selectAll: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
} {
  const { selected, onSelectedChange, pagedRows, allRows, getId } = opts;

  // Shift-range anchor: the last id toggled (on either path).
  const anchorRef = useRef<string | null>(null);

  const selectedRows = useMemo(() => {
    const source = allRows ?? pagedRows;
    return (source as T[]).filter((row) => selected.has(getId(row)));
  }, [allRows, pagedRows, selected, getId]);

  const toggle = useCallback(
    (id: string, options?: { shiftKey?: boolean; checked?: boolean }) => {
      const { shiftKey = false, checked } = options ?? {};

      if (shiftKey && anchorRef.current !== null) {
        const pagedIds = pagedRows.map(getId);
        const anchorIdx = pagedIds.indexOf(anchorRef.current);
        const targetIdx = pagedIds.indexOf(id);

        if (anchorIdx !== -1 && targetIdx !== -1) {
          const [from, to] =
            anchorIdx < targetIdx
              ? [anchorIdx, targetIdx]
              : [targetIdx, anchorIdx];
          onSelectedChange((prev) => {
            const next = new Set(prev);
            for (let i = from; i <= to; i++) {
              const rowId = pagedIds[i];
              if (rowId !== undefined) next.add(rowId);
            }
            return next;
          });
          anchorRef.current = id;
          return;
        }
      }

      onSelectedChange((prev) => {
        const next = new Set(prev);
        if (checked !== undefined) {
          if (checked) next.add(id);
          else next.delete(id);
        } else {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
        return next;
      });
      anchorRef.current = id;
    },
    [pagedRows, getId, onSelectedChange],
  );

  const selectAll = useCallback(() => {
    const source = allRows ?? pagedRows;
    onSelectedChange((prev) => {
      const next = new Set(prev);
      for (const row of source) next.add(getId(row));
      return next;
    });
  }, [allRows, pagedRows, getId, onSelectedChange]);

  const clear = useCallback(() => {
    onSelectedChange(new Set<string>());
  }, [onSelectedChange]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return { selectedRows, toggle, selectAll, clear, isSelected };
}
