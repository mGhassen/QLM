import { useMemo, useState } from 'react';
import { Building2, Calendar, Loader2, Type } from 'lucide-react';

import { OrganizationCard } from '../organization/organization-card';
import {
  EntityArrowCell,
  EntityDateCell,
  EntityNameCell,
} from './entity-list-cells';
import {
  EntityListOptionsMenu,
  type EntityListDisplayMode,
  type EntityListSortOption,
} from './entity-list-options-menu';
import { EntityListPage } from './entity-list-page';
import {
  EntityListTable,
  type EntityListColumn,
  type EntityListSortDirection,
} from './entity-list-table';

export type OrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
};

export type OrganizationListProps = {
  organizations: OrganizationListItem[];
  isLoading?: boolean;
  onCreate: () => void;
  onOpen: (org: OrganizationListItem) => void;
  title?: string;
  searchPlaceholder?: string;
  newLabel: string;
  primaryActionDataTest?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptySearchTitle?: string;
  emptySearchDescription?: string;
};

const SORT_OPTIONS: EntityListSortOption[] = [
  { value: 'createdAt', label: 'Date', icon: Calendar },
  { value: 'name', label: 'Name', icon: Type },
];

/**
 * Same list shell as NotebookList / DatasourceList: EntityListPage, shared
 * toolbar + EntityListOptionsMenu (filters), table/grid toggle.
 */
export function OrganizationList({
  organizations,
  isLoading = false,
  onCreate,
  onOpen,
  title = 'Organizations',
  searchPlaceholder = 'Search organizations...',
  newLabel,
  primaryActionDataTest,
  emptyTitle = 'No organizations',
  emptyDescription = 'No organizations have been created yet.',
  emptySearchTitle = 'No organizations match your search',
  emptySearchDescription = 'Try a different search term.',
}: Readonly<OrganizationListProps>) {
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] =
    useState<EntityListDisplayMode>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? organizations.filter((org) => org.name.toLowerCase().includes(q))
      : organizations;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (aTime - bTime) * dir;
    });
  }, [organizations, search, sortBy, sortDirection]);

  const columns: EntityListColumn<OrganizationListItem>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        width: '45%',
        render: (org) => (
          <EntityNameCell
            icon={Building2}
            name={org.name}
            subtitle={org.slug}
          />
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (org) =>
          org.createdAt ? <EntityDateCell date={org.createdAt} /> : null,
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
      title={title}
      searchPlaceholder={searchPlaceholder}
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
        label: newLabel,
        onClick: onCreate,
        'data-test': primaryActionDataTest,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {search ? emptySearchTitle : emptyTitle}
          </p>
          <p className="text-muted-foreground text-sm">
            {search ? emptySearchDescription : emptyDescription}
          </p>
        </div>
      ) : displayMode === 'table' ? (
        <EntityListTable
          columns={columns}
          items={filtered}
          getRowId={(org) => org.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={(org) => onOpen(org)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((org) => (
            <OrganizationCard
              key={org.id}
              id={org.id}
              name={org.name}
              slug={org.slug}
              createdAt={org.createdAt}
              onClick={() => onOpen(org)}
            />
          ))}
        </div>
      )}
    </EntityListPage>
  );
}
