import { useMemo, useState } from 'react';
import { Calendar, FolderKanban, Loader2, Type } from 'lucide-react';

import { ProjectCard } from '../project/project-card';
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
import type { EntityListPrimaryAction } from './entity-list-toolbar';
import {
  EntityListTable,
  type EntityListColumn,
  type EntityListSortDirection,
} from './entity-list-table';

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status?: string | null;
  createdAt?: Date;
};

export type ProjectListProps = {
  projects: ProjectListItem[];
  isLoading?: boolean;
  onOpen: (project: ProjectListItem) => void;
  /** When set, shows the primary CTA (e.g. New project). Omit when context is not ready. */
  primaryAction?: EntityListPrimaryAction;
  title?: string;
  searchPlaceholder?: string;
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
export function ProjectList({
  projects,
  isLoading = false,
  onOpen,
  primaryAction,
  title = 'Projects',
  searchPlaceholder = 'Search projects...',
  emptyTitle = 'No projects yet',
  emptyDescription = 'Create your first project to get started.',
  emptySearchTitle = 'No projects match your search',
  emptySearchDescription = 'Try a different search term.',
}: Readonly<ProjectListProps>) {
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] =
    useState<EntityListDisplayMode>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q))
      : projects;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (aTime - bTime) * dir;
    });
  }, [projects, search, sortBy, sortDirection]);

  const columns: EntityListColumn<ProjectListItem>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        width: '45%',
        render: (project) => (
          <EntityNameCell
            icon={FolderKanban}
            name={project.name}
            subtitle={project.description || project.slug}
          />
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (project) =>
          project.createdAt ? (
            <EntityDateCell date={project.createdAt} />
          ) : null,
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
      primaryAction={primaryAction}
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
          getRowId={(project) => project.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={(project) => onOpen(project)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              slug={project.slug}
              description={project.description ?? undefined}
              status={project.status ?? undefined}
              createdAt={project.createdAt}
              onClick={() => onOpen(project)}
            />
          ))}
        </div>
      )}
    </EntityListPage>
  );
}
