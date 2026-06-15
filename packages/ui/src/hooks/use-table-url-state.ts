import { useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import type {
  FilterRule,
  SortState,
} from '../qlm/data-table-advanced/types';

export type TableUrlState = Readonly<{
  filters: FilterRule[];
  sort: SortState | null;
  pageIndex: number;
  search: string;
  selection: Set<string>;
}>;

export type TableUrlSerde = Readonly<{
  parse: (raw: unknown) => TableUrlState;
  encode: (patch: Partial<TableUrlState>) => Record<string, unknown>;
  merge: (
    prev: Record<string, unknown>,
    patch: Record<string, unknown>,
  ) => Record<string, unknown>;
}>;

export type UseTableUrlStateOptions = Readonly<{
  onBeforeChange?: () => void;
}>;

export function useTableUrlState(
  serde: TableUrlSerde,
  options: UseTableUrlStateOptions = {},
) {
  const { onBeforeChange } = options;
  const raw = useSearch({ strict: false });
  const navigate = useNavigate();

  const state = useMemo(() => serde.parse(raw), [raw, serde]);
  const { filters, sort, pageIndex, search, selection } = state;

  const writeSearch = useCallback(
    (patch: Record<string, unknown>) => {
      onBeforeChange?.();
      void navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => serde.merge(prev, patch),
        replace: true,
      });
    },
    [navigate, onBeforeChange, serde],
  );

  const setFilters = useCallback(
    (updater: FilterRule[] | ((prev: FilterRule[]) => FilterRule[])) => {
      const next = typeof updater === 'function' ? updater(filters) : updater;
      writeSearch(serde.encode({ filters: next }));
    },
    [filters, writeSearch, serde],
  );

  const setSort = useCallback(
    (
      updater:
        | SortState
        | null
        | ((prev: SortState | null) => SortState | null),
    ) => {
      const next = typeof updater === 'function' ? updater(sort) : updater;
      writeSearch(serde.encode({ sort: next }));
    },
    [sort, writeSearch, serde],
  );

  const setPageIndex = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(pageIndex) : updater;
      writeSearch(serde.encode({ pageIndex: next }));
    },
    [pageIndex, writeSearch, serde],
  );

  const setSearch = useCallback(
    (next: string) => {
      writeSearch(serde.encode({ search: next }));
    },
    [writeSearch, serde],
  );

  const setSelection = useCallback(
    (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      const next = typeof updater === 'function' ? updater(selection) : updater;
      writeSearch(serde.encode({ selection: next }));
    },
    [selection, writeSearch, serde],
  );

  return {
    filters,
    setFilters,
    sort,
    setSort,
    pageIndex,
    setPageIndex,
    search,
    setSearch,
    selection,
    setSelection,
  };
}

export type UseTableUrlStateReturn = ReturnType<typeof useTableUrlState>;
