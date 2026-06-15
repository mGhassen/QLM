import { useMemo, useState } from 'react';
import {
  Notebook as NotebookIcon,
  Calendar,
  Type,
  User,
  Loader2,
} from 'lucide-react';

import type { Notebook } from '@qlm/domain/entities';
import {
  EntityListPage,
  EntityListOptionsMenu,
  EntityListTable,
  EntityNameCell,
  EntityDateCell,
  EntityArrowCell,
  type EntityListColumn,
  type EntityListDisplayMode,
  type EntityListSortDirection,
  type EntityListSortOption,
} from '@qlm/ui/entity-list';
import { NotebookCard } from '@qlm/ui/notebook';

/**
 * A summarized notebook shape for the list view — matches both the raw
 * Notebook entity and the NotebookOutput DTO.
 */
export type NotebookListItem = Pick<
  Notebook,
  'id' | 'title' | 'description' | 'slug' | 'createdAt'
> & {
  createdBy?: string | null;
};

export type NotebookListProps = {
  notebooks: NotebookListItem[];
  isLoading?: boolean;
  onCreate: () => void;
  isCreating?: boolean;
  onOpen: (notebook: NotebookListItem) => void;
  onDelete?: (id: string) => void;
};

const SORT_OPTIONS: EntityListSortOption[] = [
  { value: 'createdAt', label: 'Date', icon: Calendar },
  { value: 'title', label: 'Name', icon: Type },
];

/**
 * Presentational notebooks list. Internally manages search, sort, and
 * display mode state. Emits callbacks for open/create/delete — the consumer
 * wires these to real data mutations.
 */
export function NotebookList({
  notebooks,
  isLoading = false,
  onCreate,
  isCreating = false,
  onOpen,
  onDelete,
}: Readonly<NotebookListProps>) {
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] =
    useState<EntityListDisplayMode>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? notebooks.filter((nb) => nb.title.toLowerCase().includes(q))
      : notebooks;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (aTime - bTime) * dir;
    });
  }, [notebooks, search, sortBy, sortDirection]);

  const columns: EntityListColumn<NotebookListItem>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Name',
        sortable: true,
        width: '45%',
        render: (nb) => (
          <EntityNameCell
            icon={NotebookIcon}
            name={nb.title}
            subtitle={nb.createdBy ?? 'System'}
            subtitleIcon={User}
          />
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (nb) =>
          nb.createdAt ? <EntityDateCell date={nb.createdAt} /> : null,
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
      title="Notebooks"
      searchPlaceholder="Search notebooks..."
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
        label: 'New Notebook',
        onClick: onCreate,
        loading: isCreating,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : displayMode === 'table' ? (
        <EntityListTable
          columns={columns}
          items={filtered}
          getRowId={(nb) => nb.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={(nb) => onOpen(nb)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((nb) => (
            <NotebookCard
              key={nb.id}
              id={nb.id}
              name={nb.title}
              description={nb.description}
              createdAt={nb.createdAt}
              createdBy={nb.createdBy ?? undefined}
              onClick={() => onOpen(nb)}
              onDelete={onDelete ? () => onDelete(nb.id) : undefined}
            />
          ))}
        </div>
      )}
    </EntityListPage>
  );
}
