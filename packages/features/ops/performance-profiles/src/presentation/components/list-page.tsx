import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Eye, Gauge, Loader2 } from 'lucide-react';

import type { PerformanceProfile } from '@guepard/domain/entities';
import { encodeTabId } from '@guepard/shell-contracts';
import type { Action } from '@guepard/ui/action';
import { useShell } from '@guepard/shell-runtime';

import { EntityListPage } from '@guepard/ui/entity-list';
import {
  DataTableAdvanced,
  FilterChipRow,
  QuickFilterBar,
  applyFilterRules,
  applySort,
  type FilterRule,
  type SortState,
} from '@guepard/ui/data-table-advanced';
import type { EntityListSortOption } from '@guepard/ui/entity-list';
import {
  EntityEmptyFiltered,
  EntityEmptyFirstRun,
  EntityErrorBanner,
  EntityLoadingTableSkeleton,
} from '@guepard/ui/entity-state';
import { useDebouncedValue } from '@guepard/ui/use-debounced-value';
import { useTableVisibility } from '@guepard/ui/use-table-visibility';

import { EntitySheet } from '@guepard/ui/entity-sheet';

import { OptionsToolbar } from './options-toolbar';
import { PerformanceProfileDetailPage } from './detail-page';
import { PerformanceProfileDetailSheet } from './detail-sheet';
import { buildColumns } from '../../application/build-columns';
import { useLayoutPrefs } from '../../application/use-layout-prefs';

function filterBySearch(rows: PerformanceProfile[], query: string): PerformanceProfile[] {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (p) =>
      p.labelName.toLowerCase().includes(q) ||
      p.databaseProvider.toLowerCase().includes(q) ||
      p.databaseVersion.toLowerCase().includes(q),
  );
}

export function PerformanceProfileListPage() {
  const { t } = useTranslation('performance-profiles');
  const navigate = useNavigate();
  const shell = useShell();

  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activePpId = typeof rawSearch.pp === 'string' ? rawSearch.pp : null;

  const openInApp = useCallback(
    (profile: PerformanceProfile) => {
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'performance-profiles' },
        search: (prev: Record<string, unknown>) => ({ ...prev, pp: profile.id }),
      });
    },
    [navigate, shell.projectSlug],
  );

  const openInTab = useCallback(
    (profile: PerformanceProfile) => {
      const tid = encodeTabId({ kind: 'performance-profile-name', name: profile.labelName });
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'performance-profiles' },
        search: (prev: Record<string, unknown>) => ({ ...prev, pp: profile.id, tid }),
      });
    },
    [navigate, shell.projectSlug],
  );

  const closeDetailPage = useCallback(() => {
    void navigate({
      to: '/prj/$projectSlug/$routeBase',
      params: { projectSlug: shell.projectSlug, routeBase: 'performance-profiles' },
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.pp;
        delete next.tid;
        return next;
      },
    });
  }, [navigate, shell.projectSlug]);

  const isTabMode =
    typeof rawSearch.tid === 'string' &&
    rawSearch.tid.startsWith('performance-profile-name:');

  const profilesQuery = useQuery<PerformanceProfile[]>({
    queryKey: shell.performanceProfiles.keys.listByAccount(shell.organizationId),
    queryFn: () => shell.performanceProfiles.listByAccount(),
  });

  const activeProfileQuery = useQuery({
    queryKey: shell.performanceProfiles.keys.detail(activePpId ?? ''),
    queryFn: () => shell.performanceProfiles.get(activePpId!),
    enabled: !!activePpId,
  });

  const {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    pageSize,
    setPageSize,
    columnSizesPx,
    setColumnSizesPx,
    pinnedQuickFilters,
    setPinnedQuickFilters,
    showQuickFilters,
    setShowQuickFilters,
  } = useLayoutPrefs();

  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search, 150);

  const rowActions = useMemo<Action<unknown>[]>(
    () => [
      {
        id: 'view',
        label: t('actions.view'),
        icon: Eye,
        run: (ctx) => openInApp(ctx as PerformanceProfile),
      },
    ],
    [t, openInApp],
  );

  const columns = useMemo(
    () => buildColumns(t as never, { rowActions }),
    [t, rowActions],
  );
  const { visibleMap } = useTableVisibility(columns, visibleColumns, setVisibleColumns);

  const rawRows: PerformanceProfile[] = profilesQuery.data ?? [];
  const searchedRows = filterBySearch(rawRows, debouncedSearch);
  const filteredRows = applyFilterRules(searchedRows, filters, columns);
  const rows = applySort(filteredRows, sort, columns);
  const pagedRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const sortOptions = useMemo<EntityListSortOption[]>(
    () => [
      { value: 'labelName', label: t('col.name') },
      { value: 'provider', label: t('col.provider') },
      { value: 'version', label: t('col.version') },
      { value: 'minCpu', label: t('col.cpu') },
      { value: 'minMemory', label: t('col.memory') },
    ],
    [t],
  );

  const optionsSlot = (
    <OptionsToolbar
      isError={profilesQuery.isError}
      isFetching={profilesQuery.isFetching}
      sort={sort}
      sortOptions={sortOptions}
      showQuickFilters={showQuickFilters}
      columns={columns}
      filters={filters}
      visibleMap={visibleMap}
      onRefetch={() => profilesQuery.refetch()}
      onShowQuickFiltersChange={setShowQuickFilters}
      onSortChange={setSort}
      onFiltersChange={setFilters}
      onVisibleColumnsChange={setVisibleColumns}
    />
  );

  return (
    <>
      <EntityListPage
        title={t('list.title')}
        description={t('list.description')}
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPageIndex(0);
        }}
        options={optionsSlot}
        stretchContent
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {!profilesQuery.isError && (
            <>
              <FilterChipRow
                rules={filters}
                columns={columns}
                onChange={setFilters}
                clearLabel={t('filters.clear')}
                removeRuleAriaLabel={t('filters.removeRule')}
              />
              {showQuickFilters && (
                <QuickFilterBar
                  columns={columns}
                  pinnedKeys={pinnedQuickFilters}
                  onPinnedChange={setPinnedQuickFilters}
                  rows={rawRows}
                  rules={filters}
                  onChange={setFilters}
                  configureLabel={t('list.configureShortcuts')}
                  columnPickerLabel={t('list.quickFilters')}
                  resetLabel={t('filters.clear')}
                  preserveOnClear={['isActive']}
                />
              )}
            </>
          )}

          {profilesQuery.isError ? (
            <EntityErrorBanner
              title={t('error.title')}
              description={t('error.description')}
              retryLabel={t('error.retry')}
              onRetry={() => profilesQuery.refetch()}
            />
          ) : profilesQuery.isLoading ? (
            <EntityLoadingTableSkeleton
              columns={columns}
              visible={visibleMap}
              rows={pageSize}
            />
          ) : rawRows.length === 0 ? (
            <EntityEmptyFirstRun
              icon={<Gauge className="text-muted-foreground h-6 w-6" />}
              title={t('empty.title')}
              description={t('empty.description')}
            />
          ) : rows.length === 0 ? (
            <EntityEmptyFiltered
              title={t('empty.filteredTitle')}
              description={t('empty.filteredDescription')}
              clearLabel={t('empty.clearFilters')}
              onClear={() => {
                setFilters([]);
                setSearch('');
              }}
            />
          ) : (
            <div className="min-h-0 flex-1">
              <DataTableAdvanced
                columns={columns}
                rows={rows}
                autoFitColumns
                stickyLeftColumnKeys={
                  visibleMap.profileId ? ['profileId', 'labelName'] : ['labelName']
                }
                stickyRightColumnKeys={['actions']}
                getRowId={(p) => p.id}
                visibleColumns={visibleMap}
                sort={sort}
                onSortChange={setSort}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                reorderColumnAriaLabel={t('columns.reorderAria')}
                columnSizesPx={columnSizesPx}
                onColumnSizesPxChange={setColumnSizesPx}
                resizeColumnAriaLabel={t('columns.resizeAria')}
                pagination={{
                  pageIndex,
                  pageSize,
                  totalRows: rows.length,
                  onPageIndexChange: setPageIndex,
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPageIndex(0);
                  },
                  pageSizeOptions: [10, 20, 50, 100],
                  label: {
                    page: (idx, count) =>
                      t('pagination.page', { current: idx + 1, total: count }),
                    prev: t('pagination.prev'),
                    next: t('pagination.next'),
                    showing: (from, to, total) =>
                      t('pagination.showing', { from, to, total }),
                    rowsPerPage: t('pagination.rowsPerPage'),
                  },
                }}
                selection={selection}
                onSelectionChange={setSelection}
                selectAllAriaLabel={t('bulk.selectAll')}
                selectRowAriaLabel={t('bulk.selectRow')}
                onRowClick={openInApp}
                emptyLabel={t('list.emptyRows')}
              />
            </div>
          )}
        </div>
      </EntityListPage>
      <EntitySheet
        open={!!activePpId}
        onOpenChange={(open) => { if (!open) closeDetailPage(); }}
        size="details"
      >
        {activePpId && (
          activeProfileQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          ) : activeProfileQuery.isError || !activeProfileQuery.data ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
              <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
                <Gauge className="text-muted-foreground h-6 w-6" />
              </div>
              <p className="text-foreground text-base font-semibold">
                {t('detail.notFound.title')}
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                {t('detail.notFound.description')}
              </p>
            </div>
          ) : (
            <PerformanceProfileDetailSheet profile={activeProfileQuery.data} />
          )
        )}
      </EntitySheet>
    </>
  );
}
