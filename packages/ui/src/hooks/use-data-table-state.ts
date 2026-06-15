import {
  useTableVisibility,
  type ColumnVisibilityDefault,
} from './use-table-visibility';
import {
  useTableUrlState,
  type TableUrlSerde,
  type UseTableUrlStateReturn,
} from './use-table-url-state';

export type { ColumnVisibilityDefault };

export type UseDataTableStateOptions = Readonly<{
  urlSerde: TableUrlSerde;
  columns: ReadonlyArray<ColumnVisibilityDefault>;
  visibleColumns: Record<string, boolean>;
  onVisibleColumnsChange: (v: Record<string, boolean>) => void;
  onBeforeChange?: () => void;
}>;

/**
 * Umbrella table-state hook. Consolidates:
 *  - URL-backed view state (filters, sort, pageIndex, search, selection)
 *    via `useTableUrlState`
 *  - Column-visibility initialisation (one-shot effect, guarded against
 *    loops)
 *  - Derived `visibleMap` that fills gaps with `column.defaultHidden`
 *
 * When the full column definitions are built in a `useMemo` that closes
 * over values coming from this hook (e.g. `setFilters` from the URL
 * state), call `useTableUrlState` and `useTableVisibility` separately
 * at their natural call-order positions to break the cycle. This umbrella
 * is for the common, non-circular case.
 */
export function useDataTableState(
  opts: UseDataTableStateOptions,
): UseTableUrlStateReturn & { visibleMap: Record<string, boolean> } {
  const {
    urlSerde,
    columns,
    visibleColumns,
    onVisibleColumnsChange,
    onBeforeChange,
  } = opts;

  const urlState = useTableUrlState(urlSerde, { onBeforeChange });
  const { visibleMap } = useTableVisibility(
    columns,
    visibleColumns,
    onVisibleColumnsChange,
  );

  return { ...urlState, visibleMap };
}
