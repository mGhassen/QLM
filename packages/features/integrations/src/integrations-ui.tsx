import * as React from 'react';
import { useMemo, useState } from 'react';

import {
  AlertCircle,
  Calendar,
  Loader2,
  Plug,
  Plus,
  Type,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { IntegrationConnectionOutput } from '@guepard/domain/usecases';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
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

import { IntegrationCard } from './components/integration-card';
import { IntegrationStatusBadge } from './components/integration-status-badge';
import { ProviderLogo } from './components/provider-logo';

export type IntegrationsUIProps = Readonly<{
  /** All integrations visible to the current user in the current project. */
  integrations: IntegrationConnectionOutput[];
  /** True when the caller has the `integrations.manage` permission. */
  canManage: boolean;
  /** True while the initial list is loading. */
  isLoading: boolean;
  /** Non-null when the list query failed. Rendered as an inline error banner. */
  error: string | null;
  /** Optional "now" override — lets stories produce stable "X ago" strings. */
  now?: Date;
  onCreateClick: () => void;
  onRowClick: (id: string) => void;
  onTest: (id: string) => void;
  onRename: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}>;

const SORT_OPTIONS: EntityListSortOption[] = [
  { value: 'createdAt', label: 'Date', icon: Calendar },
  { value: 'name', label: 'Name', icon: Type },
];

/**
 * Top-level integrations list page.
 *
 * Wraps `EntityListPage` (the project-wide layout used by every other
 * entity-list screen: datasources, notebooks, projects). Owns search,
 * sort direction, and display mode state internally. The plugin root
 * passes in the fetched list + callbacks; this component is pure
 * presentational.
 */
export function IntegrationsUI(props: IntegrationsUIProps): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    integrations,
    canManage,
    isLoading,
    error,
    now,
    onCreateClick,
    onRowClick,
    onTest,
    onRename,
    onRotate,
    onDelete,
  } = props;

  const [search, setSearch] = useState('');
  const [displayMode, setDisplayMode] = useState<EntityListDisplayMode>('grid');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<EntityListSortDirection>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = q
      ? integrations.filter(
          (row) =>
            row.name.toLowerCase().includes(q) ||
            row.provider.toLowerCase().includes(q) ||
            (row.testIdentity?.toLowerCase().includes(q) ?? false) ||
            row.config.defaultRegion.toLowerCase().includes(q),
        )
      : integrations;

    return [...items].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (aTime - bTime) * dir;
    });
  }, [integrations, search, sortBy, sortDirection]);

  const columns: EntityListColumn<IntegrationConnectionOutput>[] = useMemo(
    () => [
      {
        key: 'name',
        label: t('list.columns.name'),
        sortable: true,
        width: '40%',
        render: (row) => (
          <EntityNameCell
            icon={Plug}
            name={row.name}
            subtitle={row.testIdentity ?? t(`provider.${row.provider}`)}
            subtitleIcon={User}
          />
        ),
      },
      {
        key: 'provider',
        label: t('list.columns.provider'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <ProviderLogo provider={row.provider} />
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t(`provider.${row.provider}`)}
            </span>
          </div>
        ),
      },
      {
        key: 'region',
        label: t('list.columns.region'),
        render: (row) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.config.defaultRegion}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('list.columns.status'),
        render: (row) => <IntegrationStatusBadge status={row.testStatus} />,
      },
      {
        key: 'createdAt',
        label: t('list.columns.lastTested'),
        sortable: true,
        render: (row) =>
          row.testedAt ? (
            <EntityDateCell date={row.testedAt} />
          ) : (
            <span className="text-muted-foreground text-xs">
              {t('list.lastTestedNever')}
            </span>
          ),
      },
      {
        key: 'actions',
        label: t('list.columns.actions'),
        align: 'right',
        width: '80px',
        render: () => <EntityArrowCell />,
      },
    ],
    [t],
  );

  const handleSortChange = (key: string) => {
    if (key === sortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  const disabledTitle = canManage ? undefined : t('perm.denied');

  return (
    <EntityListPage
      title={t('list.title')}
      searchPlaceholder={t('list.searchPlaceholder', {
        defaultValue: 'Search integrations…',
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
        label: t('list.newCta'),
        icon: Plus,
        onClick: onCreateClick,
        disabled: !canManage,
        'data-test': 'integrations-new',
      }}
    >
      {error !== null ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>
            {t('list.loadError', {
              defaultValue: 'Could not load integrations',
            })}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          title={disabledTitle}
        >
          <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Plug className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-foreground mb-2 text-base font-medium">
            {search
              ? t('list.emptyState.headingFiltered', {
                  defaultValue: 'No integrations match your search',
                })
              : t('list.emptyState.heading')}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {search
              ? t('list.emptyState.bodyFiltered', {
                  defaultValue: 'Try a different search.',
                })
              : t('list.emptyState.body')}
          </p>
        </div>
      ) : displayMode === 'table' ? (
        <EntityListTable
          columns={columns}
          items={filtered}
          getRowId={(row) => row.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={(row) => onRowClick(row.id)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              canManage={canManage}
              now={now}
              onRowClick={onRowClick}
              onTest={onTest}
              onRename={onRename}
              onRotate={onRotate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </EntityListPage>
  );
}
