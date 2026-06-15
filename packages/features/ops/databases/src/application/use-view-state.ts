import type { TableUrlSerde, UseTableUrlStateOptions } from '@qlm/ui/use-table-url-state';
import { useTableUrlState } from '@qlm/ui/use-table-url-state';
import type { SortState } from '@qlm/ui/data-table-advanced';

import {
  encodeFilters,
  mergeSearch,
  urlToViewState,
} from './view-state.serde';

export const databasesSerde: TableUrlSerde = {
  parse: (raw) => {
    const state = urlToViewState(raw);
    return {
      filters: state.filters,
      sort: null as SortState | null,
      pageIndex: state.pageIndex,
      search: state.search,
      selection: state.selection,
    };
  },
  encode: (patch) => {
    const out: Record<string, unknown> = {};
    if ('filters' in patch) {
      out.f = patch.filters ? encodeFilters(patch.filters) : undefined;
    }
    if ('pageIndex' in patch) {
      out.page =
        (patch.pageIndex ?? 0) > 0 ? patch.pageIndex : undefined;
    }
    if ('search' in patch) {
      out.q =
        patch.search && patch.search.length > 0 ? patch.search : undefined;
    }
    if ('selection' in patch) {
      const arr = patch.selection ? Array.from(patch.selection) : [];
      out.selected = arr.length > 0 ? arr : undefined;
    }
    return out;
  },
  merge: mergeSearch as TableUrlSerde['merge'],
};

export type UseDatabasesViewStateOptions = UseTableUrlStateOptions;

export function useViewState(options: UseDatabasesViewStateOptions = {}) {
  return useTableUrlState(databasesSerde, options);
}

export type UseViewStateReturn = ReturnType<typeof useViewState>;
