import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import { Database, Loader2, Server } from 'lucide-react';

import type { DatabaseOutput } from '@qlm/domain/usecases';
import { encodeTabId } from '@qlm/shell-contracts';
import { useShell } from '@qlm/shell-runtime';

import { DatabaseDetailPage } from './detail-page';

import { EntityListPage } from '@qlm/ui/entity-list';
import {
  BulkActionBar,
  DataTableAdvanced,
  FilterChipRow,
  QuickFilterBar,
} from '@qlm/ui/data-table-advanced';
import { cn } from '@qlm/ui/utils';
import {
  EntityEmptyFiltered,
  EntityEmptyFirstRun,
  EntityErrorBanner,
  EntityLoadingCardsSkeleton,
  EntityLoadingTableSkeleton,
} from '@qlm/ui/entity-state';

import { DatabaseCard } from './card';
import { GridPaginationFooter } from './grid-pagination-footer';
import { OptionsToolbar } from './options-toolbar';
import { GRID_COLS_CLASS } from '../../application/constants';
import { usePage } from '../../application/use-page';

type DatabaseListPageProps = Readonly<{
  docsUrl?: string;
}>;

export function DatabaseListPage({ docsUrl }: DatabaseListPageProps) {
  const { t } = useTranslation('databases');
  const navigate = useNavigate();
  const shell = useShell();
  const [createOpen, setCreateOpen] = useState(false);

  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeDbId = typeof rawSearch.db === 'string' ? rawSearch.db : null;

  // In-app navigation — no tid, renders detail inline without creating a virtual tab.
  const openDatabaseInApp = useCallback(
    (db: DatabaseOutput) => {
      const tid = encodeTabId({ kind: 'database-name', name: db.name });
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'databases' },
        search: (prev: Record<string, unknown>) => ({ ...prev, db: db.id, tid }),
      });
    },
    [navigate, shell.projectSlug],
  );

  // Tab navigation — sets tid so the shell tab-bar creates a virtual tab entry.
  const openDatabaseInTab = useCallback(
    (db: DatabaseOutput) => {
      const tid = encodeTabId({ kind: 'database-name', name: db.name });
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'databases' },
        search: (prev: Record<string, unknown>) => ({ ...prev, db: db.id, tid }),
      });
    },
    [navigate, shell.projectSlug],
  );

  const closeDatabasePage = useCallback(() => {
    void navigate({
      to: '/prj/$projectSlug/$routeBase',
      params: { projectSlug: shell.projectSlug, routeBase: 'databases' },
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.db;
        delete next.tid;
        return next;
      },
    });
  }, [navigate, shell.projectSlug]);

  // True when the current tid belongs to this app — user navigated via "Open in tab".
  const isTabMode =
    typeof rawSearch.tid === 'string' && rawSearch.tid.startsWith('database-name:');

  const page = usePage({
    onOpenDetails: openDatabaseInApp,
    onOpenInTab: openDatabaseInTab,
  });

  // Lazy-fetch the active database only when the URL says we're in detail mode.
  const activeDbQuery = useQuery({
    queryKey: shell.databases.keys.detail(activeDbId ?? ''),
    queryFn: () => shell.databases.get(activeDbId!),
    enabled: !!activeDbId,
  });

  const {
    databasesQuery,
    filters,
    setFilters,
    sort,
    setSort,
    pageIndex,
    setPageIndex,
    search,
    setSearch,
    selection,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    pageSize,
    setPageSize,
    columnSizesPx,
    setColumnSizesPx,
    displayMode,
    setDisplayMode,
    pinnedQuickFilters,
    setPinnedQuickFilters,
    showQuickFilters,
    setShowQuickFilters,
    gridCols,
    setGridCols,
    rawRows,
    rows,
    pagedRows,
    visibleMap,
    columns,
    sortOptions,
    bulkActions,
    bulkSelection,
    selectedRows,
    clearSelection,
    rowActions,
    handleDelete,
  } = page;

  const optionsSlot = (
    <OptionsToolbar
      isError={databasesQuery.isError}
      isFetching={databasesQuery.isFetching}
      displayMode={displayMode}
      sort={sort}
      sortOptions={sortOptions}
      showQuickFilters={showQuickFilters}
      onShowQuickFiltersChange={setShowQuickFilters}
      columns={columns}
      filters={filters}
      visibleMap={visibleMap}
      onRefetch={() => databasesQuery.refetch()}
      onDisplayModeChange={setDisplayMode}
      onSortChange={setSort}
      onFiltersChange={setFilters}
      onVisibleColumnsChange={setVisibleColumns}
    />
  );

  // Detail mode — render full-bleed inside the same route.
  if (activeDbId) {
    if (activeDbQuery.isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      );
    }
    if (activeDbQuery.isError || !activeDbQuery.data) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
          <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
            <Server className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="text-foreground text-base font-semibold">
            {t('detail.notFound.title')}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {t('detail.notFound.description')}
          </p>
        </div>
      );
    }
    return (
      <DatabaseDetailPage
        database={activeDbQuery.data}
        onBack={closeDatabasePage}
        onDelete={async (id) => {
          await handleDelete(id, closeDatabasePage);
        }}
      />
    );
  }

  return (
    <EntityListPage
      title={t('list.title')}
      description={t('list.description')}
      searchPlaceholder={t('list.searchPlaceholder')}
      searchValue={search}
      onSearchChange={setSearch}
      options={optionsSlot}
      primaryAction={{
        label: t('actions.create'),
        onClick: () => setCreateOpen(true),
      }}
      stretchContent
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <BulkActionBar
          selected={selectedRows}
          totalCount={rows.length}
          actions={bulkActions}
          onClear={clearSelection}
          selectedLabel={(count) => t('bulk.selectedCount', { count })}
          selectionStateLabel={{
            all: t('bulk.selectedAll'),
            selected: t('bulk.selectedWord'),
          }}
          overflowLabel={t('bulk.overflow')}
          clearLabel={t('bulk.clearSelection')}
        />

        {!databasesQuery.isError && (
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
                preserveOnClear={['status']}
              />
            )}
          </>
        )}

        {databasesQuery.isError ? (
          <EntityErrorBanner
            title={t('error.title')}
            description={t('error.description')}
            retryLabel={t('error.retry')}
            onRetry={() => databasesQuery.refetch()}
          />
        ) : databasesQuery.isLoading ? (
          displayMode === 'grid' ? (
            <EntityLoadingCardsSkeleton count={pageSize} />
          ) : (
            <EntityLoadingTableSkeleton
              columns={columns}
              visible={visibleMap}
              rows={pageSize}
            />
          )
        ) : rawRows.length === 0 ? (
          <EntityEmptyFirstRun
            icon={<Database className="text-muted-foreground h-6 w-6" />}
            title={t('empty.title')}
            description={t('empty.description')}
            primaryLabel={t('empty.cta')}
            onPrimary={() => setCreateOpen(true)}
            secondaryLabel={docsUrl ? t('empty.docs') : undefined}
            secondaryHref={docsUrl}
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
          <div className="flex min-h-0 flex-1 flex-col">
            {displayMode === 'grid' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 mb-4">
                  <VirtuosoGrid
                    data={pagedRows}
                    style={{ height: '100%' }}
                    listClassName={cn(
                      'grid gap-3 pb-3',
                      GRID_COLS_CLASS[gridCols] ?? 'grid-cols-3',
                    )}
                    itemContent={(_: number, db: DatabaseOutput) => (
                      <DatabaseCard
                        database={db}
                        selectionMode={selection.size > 0}
                        selected={selection.has(db.id)}
                        onSelect={(id, checked, shiftKey) =>
                          bulkSelection.toggle(id, { checked, shiftKey })
                        }
                        onViewDetails={openDatabaseInApp}
                        rowActions={rowActions}
                      />
                    )}
                  />
                </div>
                <GridPaginationFooter
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  totalRows={rows.length}
                  totalUnfiltered={rawRows.length}
                  gridCols={gridCols}
                  onPageIndexChange={setPageIndex}
                  onPageSizeChange={setPageSize}
                  onGridColsChange={setGridCols}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <DataTableAdvanced
                  columns={columns}
                  rows={rows}
                  autoFitColumns
                  stickyLeftColumnKeys={['name']}
                  stickyRightColumnKeys={['actions']}
                  getRowId={(db) => db.id}
                  selection={selection}
                  onSelectionChange={page.setSelection}
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
                  onRowClick={openDatabaseInApp}
                  emptyLabel={t('list.emptyRows')}
                  selectAllAriaLabel={t('bulk.selectAll')}
                  selectRowAriaLabel={t('bulk.selectRow')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </EntityListPage>
  );
}
