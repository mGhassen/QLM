import type { TFunction } from 'i18next';

import { RowActionMenu } from '@qlm/ui/action';
import type { Action } from '@qlm/ui/action';
import type { AdvancedColumn } from '@qlm/ui/data-table-advanced';
import { DbProviderIcon } from '@qlm/ui/db-provider-icon';
import { MoreHorizontal } from 'lucide-react';

import type { PerformanceProfile } from '@qlm/domain/entities';

import { PROVIDER_LABELS, PROVIDER_STYLES } from './constants';
import { ProfileStatusBadge } from '../presentation/cells/profile-status-badge';

type BuildColumnsDeps = {
  rowActions?: Action<unknown>[];
};

export function buildColumns(
  t: TFunction<'performance-profiles'>,
  { rowActions = [] }: BuildColumnsDeps = {},
): AdvancedColumn<PerformanceProfile>[] {
  return [
    {
      key: 'profileId',
      label: t('col.profileId'),
      sortable: true,
      sortAccessor: (row) => row.id,
      defaultHidden: true,
      minWidthPx: 180,
      maxWidthPx: 340,
      truncate: true,
      measureCell: (row) => row.id,
      filter: { kind: 'text', accessor: (row) => row.id },
      render: (row) => (
        <span className="text-muted-foreground font-mono text-xs">{row.id}</span>
      ),
      exportCell: (row) => row.id,
    },
    {
      key: 'labelName',
      label: t('col.name'),
      sortable: true,
      sortAccessor: (row) => row.labelName,
      truncate: true,
      grow: true,
      minWidthPx: 200,
      maxWidthPx: 600,
      filter: { kind: 'text', accessor: (row) => row.labelName },
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-border/40 bg-muted/20">
            <DbProviderIcon provider={row.databaseProvider} size={20} className="opacity-80" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground truncate text-sm font-semibold">
              {row.labelName}
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
      sortAccessor: (row) => row.databaseProvider,
      minWidthPx: 100,
      maxWidthPx: 140,
      measureCell: (row) => PROVIDER_LABELS[row.databaseProvider] ?? row.databaseProvider,
      filter: {
        kind: 'enum',
        accessor: (row) => row.databaseProvider,
        options: Object.keys(PROVIDER_LABELS).map((p) => ({
          value: p,
          label: PROVIDER_LABELS[p] ?? p,
        })),
      },
      render: (row) => {
        const style = PROVIDER_STYLES[row.databaseProvider];
        const label = PROVIDER_LABELS[row.databaseProvider] ?? row.databaseProvider;
        return (
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-none border-2 px-2 h-5 max-w-full min-w-0 overflow-hidden',
              'text-[10px] font-black uppercase tracking-widest leading-none',
              style?.bg ?? 'bg-muted/50',
              style?.text ?? 'text-muted-foreground',
              style?.border ?? 'border-border',
            ].join(' ')}
          >
            <span className="shrink-0 inline-flex">
              <DbProviderIcon provider={row.databaseProvider} size={12} />
            </span>
            <span className="truncate min-w-0">{label}</span>
          </span>
        );
      },
    },
    {
      key: 'version',
      label: t('col.version'),
      sortable: true,
      sortAccessor: (row) => row.databaseVersion,
      minWidthPx: 80,
      maxWidthPx: 100,
      filter: { kind: 'text', accessor: (row) => row.databaseVersion },
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          v{row.databaseVersion}
        </span>
      ),
    },
    {
      key: 'minCpu',
      label: t('col.cpu'),
      sortable: true,
      sortAccessor: (row) => row.minCpu,
      minWidthPx: 80,
      maxWidthPx: 120,
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(row.minCpu / 1000).toFixed(1)} vCPU
        </span>
      ),
    },
    {
      key: 'minMemory',
      label: t('col.memory'),
      sortable: true,
      sortAccessor: (row) => row.minMemory,
      minWidthPx: 80,
      maxWidthPx: 120,
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(row.minMemory / 1024).toFixed(1)} GB
        </span>
      ),
    },
    {
      key: 'isDefault',
      label: t('col.default'),
      minWidthPx: 80,
      maxWidthPx: 100,
      measureCell: (row) => (row.isDefault ? t('col.default') : ''),
      filter: {
        kind: 'enum',
        accessor: (row) => String(row.isDefault),
        options: [
          { value: 'true', label: t('col.default') },
          { value: 'false', label: '—' },
        ],
      },
      render: (row) =>
        row.isDefault ? (
          <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none text-foreground/70">
            {t('col.default')}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'isActive',
      label: t('col.active'),
      minWidthPx: 80,
      maxWidthPx: 120,
      measureCell: (row) => (row.isActive ? t('status.active') : t('status.inactive')),
      filter: {
        kind: 'enum',
        accessor: (row) => String(row.isActive),
        options: [
          { value: 'true', label: t('status.active') },
          { value: 'false', label: t('status.inactive') },
        ],
      },
      render: (row) => <ProfileStatusBadge isActive={row.isActive} />,
    },
    {
      key: 'actions',
      label: t('col.actions'),
      align: 'center',
      required: true,
      width: '80px',
      minWidthPx: 80,
      maxWidthPx: 80,
      measureCell: () => '',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionMenu row={row} actions={rowActions} ariaLabel={t('col.actions')} />
        </div>
      ),
    },
  ];
}
