import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Calendar,
  Database,
  Loader2,
  Type,
  User,
} from 'lucide-react';

import type { Datasource } from '@guepard/domain/entities';
import type { DatasourceExtension } from '@guepard/extensions-sdk';
import { DatasourceCard } from '@guepard/ui/guepard/datasource';
import {
  EntityArrowCell,
  EntityDateCell,
  EntityListOptionsMenu,
  EntityListPage,
  EntityListTable,
  EntityNameCell,
  type EntityListColumn,
  type EntityListDisplayMode,
  type EntityListSortDirection,
  type EntityListSortOption,
} from '@guepard/ui/entity-list';

/**
 * A summarized datasource shape for the list view — matches both the raw
 * Datasource entity and the DatasourceOutput DTO.
 */
export type DatasourceListItem = Pick<
  Datasource,
  'id' | 'name' | 'slug' | 'datasource_provider' | 'createdAt'
> & {
  createdBy?: string | null;
};

export interface DatasourceListProps {
  datasources: DatasourceListItem[];
  /** Datasource extensions, used only for provider logos. */
  extensions?: DatasourceExtension[];
  isLoading?: boolean;
  onCreate: () => void;
  onOpen: (datasource: DatasourceListItem) => void;
}

const SORT_OPTIONS: EntityListSortOption[] = [
  { value: 'createdAt', label: 'Date', icon: Calendar },
  { value: 'name', label: 'Name', icon: Type },
];

/**
 * Presentational datasources list. Manages search/sort/display mode internally
 * and emits open/create/delete callbacks. The consumer (shell app plugin-root)
 * wires these to shell runtime mutations.
 */
export function DatasourceList({
  datasources,
  extensions = [],
  isLoading = false,
  onCreate,
  onOpen,
}: Readonly<DatasourceListProps>) {
  const { t } = useTranslation('datasources');
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] = useState<EntityListDisplayMode>('grid');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');

  // Provider → logo lookup from the extension registry.
  const providerLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ext of extensions) {
      map.set(ext.id, ext.icon);
    }
    return map;
  }, [extensions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? datasources.filter(
          (ds) =>
            ds.name.toLowerCase().includes(q) ||
            ds.datasource_provider.toLowerCase().includes(q),
        )
      : datasources;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (aTime - bTime) * dir;
    });
  }, [datasources, search, sortBy, sortDirection]);

  const columns: EntityListColumn<DatasourceListItem>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        width: '45%',
        render: (ds) => (
          <EntityNameCell
            icon={Database}
            name={ds.name}
            subtitle={ds.createdBy ?? 'System'}
            subtitleIcon={User}
          />
        ),
      },
      {
        key: 'datasource_provider',
        label: 'Provider',
        render: (ds) => (
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
            {ds.datasource_provider}
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (ds) =>
          ds.createdAt ? <EntityDateCell date={ds.createdAt} /> : null,
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        width: '80px',
        render: () => <EntityArrowCell />,
      },
    ],
    [],
  );

  const handleSortChange = (key: string) => {
    if (key === sortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  return (
    <EntityListPage
      title={t('list_title')}
      searchPlaceholder={t('searchPlaceholder', {
        defaultValue: 'Search datasources...',
      })}
      searchValue={search}
      onSearchChange={setSearch}
      options={
        <EntityListOptionsMenu
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          sortBy={sortBy}
          sortDirection={sortDirection}
          sortOptions={SORT_OPTIONS}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />
      }
      primaryAction={{
        label: t('newDatasource'),
        onClick: onCreate,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {t('emptyTitle', { defaultValue: 'No datasources found' })}
          </p>
          <p className="text-muted-foreground text-sm">
            {search
              ? t('emptySearch', { defaultValue: 'Try a different search.' })
              : t('emptyDescription', {
                  defaultValue:
                    'Connect your first data source to get started.',
                })}
          </p>
        </div>
      ) : displayMode === 'table' ? (
        <EntityListTable
          columns={columns}
          items={filtered}
          getRowId={(ds) => ds.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={(ds) => onOpen(ds)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ds) => (
            <DatasourceCard
              key={ds.id}
              id={ds.id}
              name={ds.name}
              createdAt={ds.createdAt}
              createdBy={ds.createdBy ?? 'Unknown'}
              logo={providerLogoMap.get(ds.datasource_provider)}
              provider={ds.datasource_provider}
              onClick={() => onOpen(ds)}
              viewButton={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(ds);
                  }}
                  className="flex w-full items-center justify-center gap-2 px-3 py-2"
                >
                  <span className="text-foreground text-xs font-medium">
                    {t('card.view')}
                  </span>
                  <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
                </button>
              }
              dataTest={`datasource-card-${ds.id}`}
            />
          ))}
        </div>
      )}
    </EntityListPage>
  );
}
