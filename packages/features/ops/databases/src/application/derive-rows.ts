import type { AdvancedColumn, FilterRule, SortState } from '@qlm/ui/data-table-advanced';
import { applyFilterRules, applySort } from '@qlm/ui/data-table-advanced';

import type { DatabaseOutput } from '@qlm/domain/usecases';

export function filterDatabasesBySearch(
  rows: readonly DatabaseOutput[],
  query: string,
): DatabaseOutput[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter(
    (db) =>
      db.name.toLowerCase().includes(q) ||
      db.provider.toLowerCase().includes(q) ||
      db.fqdn.toLowerCase().includes(q) ||
      db.version.toLowerCase().includes(q),
  );
}

export function deriveRows(args: {
  rawRows: DatabaseOutput[];
  debouncedSearch: string;
  filters: FilterRule[];
  sort: SortState | null;
  columns: AdvancedColumn<DatabaseOutput>[];
}) {
  const { rawRows, debouncedSearch, filters, sort, columns } = args;

  const searchedRows = filterDatabasesBySearch(rawRows, debouncedSearch);
  const filteredRows = applyFilterRules(searchedRows, filters, columns);
  const rows = applySort(filteredRows, sort, columns);

  return { searchedRows, filteredRows, rows } as const;
}
