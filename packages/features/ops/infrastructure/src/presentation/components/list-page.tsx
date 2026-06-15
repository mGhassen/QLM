import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import { AlertTriangle, Loader2, Server, X } from 'lucide-react';

import type { Node } from '@guepard/domain/entities';
import { encodeTabId } from '@guepard/shell-contracts';
import { useShell } from '@guepard/shell-runtime';

import { DetailPage } from './detail-page';

import { EntityListPage } from '@guepard/ui/entity-list';
import {
  BulkActionBar,
  DataTableAdvanced,
  FilterChipRow,
  QuickFilterBar,
} from '@guepard/ui/data-table-advanced';
import { cn } from '@guepard/ui/utils';
import {
  EntityEmptyFiltered,
  EntityEmptyFirstRun,
  EntityErrorBanner,
  EntityLoadingCardsSkeleton,
  EntityLoadingTableSkeleton,
} from '@guepard/ui/entity-state';

import { DetailsSheet } from './details-sheet';
import { CreateSheet } from './create-sheet';
import { DrainDialog } from './drain-dialog';
import { Card } from './card';
import { CommandPalette } from './command-palette';
import { GridPaginationFooter } from './grid-pagination-footer';
import { OptionsToolbar } from './options-toolbar';
import { GRID_COLS_CLASS } from '../../application/constants';
import { usePage } from '../../application/use-page';

type ListPageProps = Readonly<{
  projectId: string;
  docsUrl?: string;
}>;

export function ListPage({ projectId, docsUrl }: ListPageProps) {
  const { t } = useTranslation('nodes');
  const navigate = useNavigate();
  const shell = useShell();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Active per-node detail is driven by URL state — staying inside the
  // infrastructure route avoids a full shell remount and keeps the existing
  // tab system happy (the `tid` query param produces a virtual tab).
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeNodeId =
    typeof rawSearch.node === 'string' ? rawSearch.node : null;

  // In-app navigation — no tid, renders detail inline without creating a virtual tab.
  const openNodeInApp = useCallback(
    (node: Node) => {
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
        search: (prev: Record<string, unknown>) => ({ ...prev, node: node.id }),
      });
    },
    [navigate, shell.projectSlug],
  );

  // Tab navigation — sets tid so the shell tab-bar creates a virtual tab entry.
  const openNodeInTab = useCallback(
    (node: Node) => {
      const tid = encodeTabId({ kind: 'node-name', name: node.name });
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
        search: (prev: Record<string, unknown>) => ({ ...prev, node: node.id, tid }),
      });
    },
    [navigate, shell.projectSlug],
  );

  const closeNodePage = useCallback(() => {
    void navigate({
      to: '/prj/$projectSlug/$routeBase',
      params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.node;
        delete next.tid;
        return next;
      },
    });
  }, [navigate, shell.projectSlug]);

  // True when the current tid belongs to this app — user navigated via "Open in tab".
  const isTabMode =
    typeof rawSearch.tid === 'string' && rawSearch.tid.startsWith('node-name:');

  const page = usePage({
    projectId,
    onOpenDetails: setDetailsId,
    onOpenInTab: openNodeInTab,
  });

  // Lazy-fetch the active node only when the URL says we're in detail mode.
  const activeNodeQuery = useQuery({
    queryKey: shell.nodes.keys.detail(activeNodeId ?? ''),
    queryFn: () => shell.nodes.get(activeNodeId!),
    enabled: !!activeNodeId,
  });

  const {
    nodesQuery,
    mutations,
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
    isIdVisible,
    columns,
    nodeSortOptions,
    bulkActions,
    bulkSelection,
    selectedRows,
    clearSelection,
    flashClassFor,
    handleTagClick,
    handleInlineLifecycleChange,
    handleDrain,
    handleCancelDrain,
    handleDelete,
    toggleLifecycleFilter,
    toggleProviderFilter,
    drainTarget,
    closeDrainDialog,
    confirmDrain,
    isDrainSubmitting,
  } = page;

  const optionsSlot = (
    <OptionsToolbar
      isError={nodesQuery.isError}
      isFetching={nodesQuery.isFetching}
      displayMode={displayMode}
      sort={sort}
      sortOptions={nodeSortOptions}
      showQuickFilters={showQuickFilters}
      onShowQuickFiltersChange={setShowQuickFilters}
      columns={columns}
      filters={filters}
      visibleMap={visibleMap}
      onRefetch={() => nodesQuery.refetch()}
      onDisplayModeChange={setDisplayMode}
      onSortChange={setSort}
      onFiltersChange={setFilters}
      onVisibleColumnsChange={setVisibleColumns}
    />
  );

  // Detail mode — render full-bleed inside the same route. List stays
  // unmounted while detail is open (cheap thanks to react-query cache).
  if (activeNodeId) {
    if (activeNodeQuery.isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      );
    }
    if (activeNodeQuery.isError || !activeNodeQuery.data) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
          <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border">
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
      <DetailPage
        node={activeNodeQuery.data}
        projectSlug={shell.projectSlug}
        onBack={closeNodePage}
        onSetLifecycle={handleInlineLifecycleChange}
        onDrain={handleDrain}
        onCancelDrain={handleCancelDrain}
        onDelete={async (id) => {
          await handleDelete(id, closeNodePage);
        }}
      />
    );
  }

  return (
    <>
      <EntityListPage
        title={t('list.title')}
        description={t('list.description')}
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        options={optionsSlot}
        primaryAction={{
          label: t('list.create'),
          onClick: () => setCreateOpen(true),
        }}
        stretchContent
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {rawSearch.tid === 'topology-attention' && (
            <AttentionContextBanner
              label={t('attentionContext.banner')}
              dismissLabel={t('attentionContext.dismiss')}
              onDismiss={() => {
                void navigate({
                  to: '/prj/$projectSlug/$routeBase',
                  params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
                  search: (prev: Record<string, unknown>) => {
                    const next = { ...prev };
                    delete next.health;
                    delete next.tid;
                    return next;
                  },
                });
              }}
            />
          )}
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

          {!nodesQuery.isError && (
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
                  preserveOnClear={[]}
                />
              )}
            </>
          )}

          {nodesQuery.isError ? (
            <EntityErrorBanner
              title={t('error.title')}
              description={t('error.description')}
              retryLabel={t('error.retry')}
              onRetry={() => nodesQuery.refetch()}
            />
          ) : nodesQuery.isLoading ? (
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
              icon={<Server className="text-muted-foreground h-6 w-6" />}
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
                      itemContent={(_, node) => (
                        <Card
                          node={node}
                          selectionMode={selection.size > 0}
                          selected={selection.has(node.id)}
                          onSelect={(id, checked, shiftKey) =>
                            bulkSelection.toggle(id, { checked, shiftKey })
                          }
                          onViewDetails={openNodeInApp}
                          onSetLifecycle={handleInlineLifecycleChange}
                          onDrain={handleDrain}
                          onCancelDrain={handleCancelDrain}
                          flashClass={flashClassFor(node.id)}
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
                    stickyLeftColumnKeys={isIdVisible ? ['nodeId', 'name'] : ['name']}
                    stickyRightColumnKeys={['actions']}
                    getRowId={(n) => n.id}
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
                    onRowClick={openNodeInApp}
                    getRowClassName={(n) => flashClassFor(n.id)}
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

      <DetailsSheet
        nodeId={detailsId}
        open={!!detailsId}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onTagClick={(tag) => {
          handleTagClick(tag);
          setDetailsId(null);
        }}
        onSetLifecycle={handleInlineLifecycleChange}
        onDrain={handleDrain}
        onCancelDrain={handleCancelDrain}
        onUpdate={async (input) => {
          await mutations.update.mutateAsync(input);
        }}
        onDelete={async (id) => {
          await handleDelete(id, () => setDetailsId(null));
        }}
      />

      <CreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          await mutations.create.mutateAsync(input);
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        rows={rawRows}
        onOpenNode={(id) => setDetailsId(id)}
        onCreate={() => setCreateOpen(true)}
        onSetDisplayMode={(m) => setDisplayMode(m)}
        onToggleLifecycle={toggleLifecycleFilter}
        onToggleProvider={toggleProviderFilter}
      />

      <DrainDialog
        open={drainTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDrainDialog();
        }}
        nodeName={drainTarget?.name ?? ''}
        onConfirm={confirmDrain}
        isSubmitting={isDrainSubmitting}
      />
    </>
  );
}

type AttentionContextBannerProps = Readonly<{
  label: string;
  dismissLabel: string;
  onDismiss: () => void;
}>;
function AttentionContextBanner({ label, dismissLabel, onDismiss }: AttentionContextBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-[11px] font-bold uppercase tracking-tight">
        {label}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
        className="inline-flex items-center gap-1.5 rounded-none border border-current/20 px-2.5 h-7 text-[10px] font-bold uppercase tracking-tight cursor-pointer hover:bg-destructive/20 transition-colors"
      >
        <X className="h-3 w-3" />
        {dismissLabel}
      </button>
    </div>
  );
}
