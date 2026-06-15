import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Notebook as NotebookIcon, Calendar, Type, User } from 'lucide-react';

import { EntityListPage } from './entity-list-page';
import {
  EntityListOptionsMenu,
  type EntityListDisplayMode,
  type EntityListSortOption,
} from './entity-list-options-menu';
import {
  EntityListTable,
  type EntityListColumn,
  type EntityListSortDirection,
} from './entity-list-table';
import {
  EntityArrowCell,
  EntityDateCell,
  EntityNameCell,
} from './entity-list-cells';
import { NotebookCard } from '../notebook/notebook-card';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type MockNotebook = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
};

const MOCK_NOTEBOOKS: MockNotebook[] = [
  {
    id: 'nb-1',
    name: 'Untitled notebook',
    createdBy: 'System',
    createdAt: new Date('2026-04-11T10:29:00'),
  },
  {
    id: 'nb-2',
    name: 'Remove organization',
    createdBy: 'System',
    createdAt: new Date('2026-02-17T11:08:00'),
  },
  {
    id: 'nb-3',
    name: 'Analyse Qwery Enterprise',
    createdBy: 'System',
    createdAt: new Date('2026-02-16T18:05:00'),
  },
  {
    id: 'nb-4',
    name: 'Q1 metrics dashboard',
    createdBy: 'john@acme.com',
    createdAt: new Date('2026-01-28T14:12:00'),
  },
  {
    id: 'nb-5',
    name: 'User churn analysis',
    createdBy: 'alice@acme.com',
    createdAt: new Date('2026-01-05T09:45:00'),
  },
];

const SORT_OPTIONS: EntityListSortOption[] = [
  { value: 'createdAt', label: 'Date', icon: Calendar },
  { value: 'name', label: 'Name', icon: Type },
];

// ---------------------------------------------------------------------------
// Stateful wrapper
// ---------------------------------------------------------------------------

function NotebookListDemo() {
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] =
    useState<EntityListDisplayMode>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? MOCK_NOTEBOOKS.filter((nb) => nb.name.toLowerCase().includes(q))
      : MOCK_NOTEBOOKS;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
    });
  }, [search, sortBy, sortDirection]);

  const columns: EntityListColumn<MockNotebook>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        width: '40%',
        render: (nb) => (
          <EntityNameCell
            icon={NotebookIcon}
            name={nb.name}
            subtitle={nb.createdBy}
            subtitleIcon={User}
          />
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (nb) => <EntityDateCell date={nb.createdAt} />,
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

  return (
    <div className="bg-background h-screen w-screen overflow-auto">
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
            quickFiltersVisible={showQuickFilters}
            onQuickFiltersVisibleChange={setShowQuickFilters}
          />
        }
        primaryAction={{
          label: 'New Notebook',
          onClick: () => console.log('create notebook'),
        }}
      >
        {displayMode === 'table' ? (
          <EntityListTable
            columns={columns}
            items={filtered}
            getRowId={(nb) => nb.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(key) => {
              if (key === sortBy) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy(key);
              }
            }}
            onRowClick={(nb) => console.log('open', nb.id)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((nb) => (
              <NotebookCard
                key={nb.id}
                id={nb.id}
                name={nb.name}
                createdAt={nb.createdAt}
                createdBy={nb.createdBy}
                onClick={() => console.log('open', nb.id)}
              />
            ))}
          </div>
        )}
      </EntityListPage>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state story
// ---------------------------------------------------------------------------

function EmptyListDemo() {
  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] =
    useState<EntityListDisplayMode>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  const columns: EntityListColumn<MockNotebook>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '40%',
      render: (nb) => (
        <EntityNameCell
          icon={NotebookIcon}
          name={nb.name}
          subtitle={nb.createdBy}
          subtitleIcon={User}
        />
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (nb) => <EntityDateCell date={nb.createdAt} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      width: '80px',
      render: () => <EntityArrowCell />,
    },
  ];

  return (
    <div className="bg-background h-screen w-screen overflow-auto">
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
            quickFiltersVisible={showQuickFilters}
            onQuickFiltersVisibleChange={setShowQuickFilters}
          />
        }
        primaryAction={{
          label: 'New Notebook',
          onClick: () => console.log('create notebook'),
        }}
      >
        <EntityListTable
          columns={columns}
          items={[]}
          getRowId={(nb) => nb.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
        />
      </EntityListPage>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Rasm/EntityListPage',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const NotebookList: Story = {
  render: () => <NotebookListDemo />,
};

export const Empty: Story = {
  render: () => <EmptyListDemo />,
};
