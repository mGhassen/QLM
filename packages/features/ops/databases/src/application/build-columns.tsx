import type { TFunction } from 'i18next';
import { DbProviderIcon } from '@qlm/ui/db-provider-icon';

import { RowActionMenu } from '@qlm/ui/action';
import type { Action } from '@qlm/ui/action';
import type { AdvancedColumn } from '@qlm/ui/data-table-advanced';

import {
  DATABASE_PROVIDERS,
  DATABASE_STATUSES,
} from '@qlm/domain/entities';
import type { DatabaseOutput } from '@qlm/domain/usecases';

import { DbProviderBadge } from '../presentation/cells/db-provider-badge';
import { DbStatusBadge } from '../presentation/cells/db-status-badge';

type BuildColumnsDeps = {
  rowActions?: Action<unknown>[];
};

export function buildColumns(
  t: TFunction<'databases'>,
  { rowActions = [] }: BuildColumnsDeps = {},
): AdvancedColumn<DatabaseOutput>[] {
  return [
    {
      key: 'name',
      label: t('col.name'),
      sortable: true,
      sortAccessor: (row) => row.name,
      truncate: true,
      grow: true,
      minWidthPx: 200,
      maxWidthPx: 600,
      filter: { kind: 'text', accessor: (row) => row.name },
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-border/40 bg-muted/20">
            <DbProviderIcon provider={row.provider} size={20} className="opacity-80" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground truncate text-sm font-semibold">
              {row.name}
            </span>
            <span className="text-muted-foreground truncate font-mono text-[10px] opacity-50 uppercase tracking-tighter">
              {row.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: t('col.provider'),
      sortable: true,
      sortAccessor: (row) => row.provider,
      measureCell: (row) => t(`provider.${row.provider}`),
      minWidthPx: 100,
      maxWidthPx: 140,
      filter: {
        kind: 'enum',
        accessor: (row) => row.provider,
        options: DATABASE_PROVIDERS.map((p) => ({
          value: p,
          label: t(`provider.${p}`),
        })),
      },
      render: (row) => <DbProviderBadge provider={row.provider} />,
    },
    {
      key: 'version',
      label: t('col.version'),
      sortable: true,
      sortAccessor: (row) => row.version,
      minWidthPx: 80,
      maxWidthPx: 100,
      filter: { kind: 'text', accessor: (row) => row.version },
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">v{row.version}</span>
      ),
    },
    {
      key: 'status',
      label: t('col.status'),
      sortable: true,
      sortAccessor: (row) => row.status,
      measureCell: (row) => t(`status.${row.status}`),
      minWidthPx: 80,
      maxWidthPx: 120,
      filter: {
        kind: 'enum',
        accessor: (row) => row.status,
        options: DATABASE_STATUSES.map((s) => ({
          value: s,
          label: t(`status.${s}`),
        })),
      },
      render: (row) => <DbStatusBadge status={row.status} />,
    },
    {
      key: 'compute',
      label: t('col.compute'),
      minWidthPx: 90,
      maxWidthPx: 140,
      measureCell: (row) => row.compute?.performanceProfile?.labelName ?? '',
      filter: {
        kind: 'text',
        accessor: (row) => row.compute?.performanceProfile?.labelName ?? '',
      },
      render: (row) => {
        const tier = row.compute?.performanceProfile?.labelName;
        if (!tier) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none text-foreground/70">
            {tier}
          </span>
        );
      },
    },
    {
      key: 'port',
      label: t('col.port'),
      minWidthPx: 60,
      maxWidthPx: 80,
      filter: { kind: 'text', accessor: (row) => String(row.port ?? '') },
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.port ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('col.actions'),
      align: 'right',
      required: true,
      width: '48px',
      minWidthPx: 48,
      maxWidthPx: 48,
      measureCell: () => '',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionMenu row={row} actions={rowActions} ariaLabel={t('col.actions')} />
        </div>
      ),
    },
  ];
}
