import type { TableUrlSerde, UseTableUrlStateOptions } from '@qlm/ui/use-table-url-state';
import { useTableUrlState } from '@qlm/ui/use-table-url-state';
import type { SortState } from '@qlm/ui/data-table-advanced';

import {
  encodeFilters,
  mergeSearch,
  urlToViewState,
} from './view-state.serde';

export const nodesSerde: TableUrlSerde = {
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
      out.lifecycle = undefined;
      out.eligibility = undefined;
      out.region = undefined;
      out.provider = undefined;
      out.cluster = undefined;
      out.nocl = undefined;
      out.health = undefined;
    }
    if ('pageIndex' in patch) {
      out.page =
        (patch.pageIndex ?? 0) > 0 ? patch.pageIndex : undefined;
    }
    if ('search' in patch) {
      out.q =
        patch.search && patch.search.length > 0
          ? patch.search
          : undefined;
    }
    if ('selection' in patch) {
      const arr = patch.selection ? Array.from(patch.selection) : [];
      out.selected = arr.length > 0 ? arr : undefined;
    }
    return out;
  },
  merge: mergeSearch as TableUrlSerde['merge'],
};

export type UseNodesViewStateOptions = UseTableUrlStateOptions;

export function useViewState(options: UseNodesViewStateOptions = {}) {
  return useTableUrlState(nodesSerde, options);
}

export type UseViewStateReturn = ReturnType<typeof useViewState>;
