import type { AdvancedColumn, FilterRule, SortState } from '@guepard/ui/data-table-advanced';
import { applyFilterRules, applySort } from '@guepard/ui/data-table-advanced';

import type { Node } from '@guepard/domain/entities';

import { filterNodesBySearch } from './selectors';

export function deriveRows(args: {
  rawRows: Node[];
  debouncedSearch: string;
  filters: FilterRule[];
  sort: SortState | null;
  columns: AdvancedColumn<Node>[];
}) {
  const { rawRows, debouncedSearch, filters, sort, columns } = args;

  const searchedRows = filterNodesBySearch(rawRows, debouncedSearch);
  const filteredRows = applyFilterRules(searchedRows, filters, columns);
  const rows = applySort(filteredRows, sort, columns);

  return {
    searchedRows,
    filteredRows,
    rows,
  } as const;
}

