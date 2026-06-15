import { CircleHelp, Server, Tag } from 'lucide-react';

import type { Action } from '@qlm/ui/action';
import { RowActionMenu } from '@qlm/ui/action';
import type { AdvancedColumn } from '@qlm/ui/data-table-advanced';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@qlm/ui/tooltip';
import { cn, highlightSearchMatch } from '@qlm/ui/utils';

import {
  NODE_HEALTH,
  NODE_KINDS,
  NODE_LIFECYCLE_STATES,
  NODE_PROVIDERS,
  NODE_REGIONS,
  type Node,
} from '@qlm/domain/entities';
import { HealthStatusBadge } from '../presentation/cells/health-status-badge';
import { HeatBar } from '../presentation/cells/heat-bar';
import { LastSeenDot } from '../presentation/cells/last-seen-dot';
import { ProviderIcon } from '../presentation/cells/provider-icon';
import { getNodeDisplayState } from '../presentation/lib/get-node-display-state';
import {
  DISPLAY_BADGE_CLASSES,
  PROVIDER_STYLES,
} from './constants';

/**
 * Lifecycle-axis sort priority. Used by the lifecycle column sort accessor.
 * Active nodes float to the top, terminal states sink. Drain coupling is
 * surfaced through the badge composite, not the sort key.
 */
const LIFECYCLE_PRIORITY: Record<string, number> = {
  active: 0,
  provisioning: 1,
  stopping: 2,
  stopped: 3,
  terminating: 4,
  terminated: 5,
};

/** Display-state visual tokens for the dot in the lifecycle filter chip. */
const DISPLAY_CHIP_DOT: Record<string, string> = {
  running: 'bg-emerald-600',
  draining: 'bg-amber-600',
  stopped: 'bg-muted-foreground/60',
  inactive: 'bg-muted-foreground/40',
  pending: 'bg-blue-500',
  degraded: 'bg-amber-500',
  critical: 'bg-destructive',
  unreachable: 'bg-destructive',
  ineligible: 'bg-muted-foreground/60',
};
import { fmtDate } from './selectors';

// Structural `t` — see use-nodes-actions.ts for rationale.
type TFn = {
  (key: string): string;
  (key: string, options: Record<string, unknown>): string;
};

export type BuildColumnsDeps = Readonly<{
  t: TFn;
  debouncedSearch: string;
  isIdVisible: boolean;
  maxCpu: number;
  maxMem: number;
  rowActions: Action<Node>[];
  statusQuickActions: Action<Node>[];
  onTagClick: (tag: string) => void;
}>;

export function buildColumns(deps: BuildColumnsDeps): AdvancedColumn<Node>[] {
  const { t, debouncedSearch, isIdVisible, maxCpu, maxMem, rowActions, statusQuickActions, onTagClick } = deps;

  return [
    {
      key: 'nodeId',
      label: t('col.nodeId'),
      sortable: true,
      sortAccessor: (n) => n.id,
      filter: { kind: 'text', accessor: (n) => n.id },
      defaultHidden: true,
      minWidthPx: 180,
      maxWidthPx: 340,
      truncate: true,
      measureCell: (n) => n.id,
      render: (n) => (
        <span className="text-muted-foreground font-mono text-xs">
          {highlightSearchMatch(n.id, debouncedSearch)}
        </span>
      ),
      exportCell: (n) => n.id,
    },
    {
      key: 'name',
      label: t('col.name'),
      sortable: true,
      sortAccessor: (n) => n.name,
      filter: { kind: 'text', accessor: (n) => n.name },
      required: true,
      grow: true,
      minWidthPx: 200,
      maxWidthPx: 620,
      truncate: true,
      measureCell: (n) => isIdVisible ? n.name : `${n.name} ${n.id}`,
      render: (n) => {
        const displayState = getNodeDisplayState(n);
        const tone = DISPLAY_BADGE_CLASSES[displayState.kind] ?? '';
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2',
                tone,
              )}
            >
              <ProviderIcon provider={n.provider} size={20} minimal />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground truncate text-sm font-semibold">
                {highlightSearchMatch(n.name, debouncedSearch)}
              </span>
              {!isIdVisible && (
                <span className="text-muted-foreground truncate font-mono text-[11px]">
                  {highlightSearchMatch(n.id, debouncedSearch)}
                </span>
              )}
            </div>
          </div>
        );
      },
      exportCell: (n) => n.name,
    },
    {
      key: 'region',
      label: t('col.region'),
      sortable: true,
      sortAccessor: (n) => n.region,
      filter: {
        kind: 'enum',
        options: NODE_REGIONS.map((v) => ({ value: v, label: v })),
      },
      minWidthPx: 120,
      maxWidthPx: 240,
      truncate: true,
      render: (n) => (
        <span className="text-foreground/80 font-mono text-xs">
          {n.region}
        </span>
      ),
      exportCell: (n) => n.region,
    },
    {
      key: 'kind',
      label: t('col.kind'),
      sortable: true,
      sortAccessor: (n) => n.kind,
      filter: {
        kind: 'enum',
        options: NODE_KINDS.map((v) => ({ value: v, label: t(`kind.${v}`) })),
      },
      minWidthPx: 160,
      maxWidthPx: 300,
      truncate: true,
      measureCell: (n) => t(`kind.${n.kind}`),
      render: (n) => (
        <span className="bg-muted/60 text-foreground/80 rounded-none px-1.5 py-0.5 text-[11px] font-medium">
          {t(`kind.${n.kind}`)}
        </span>
      ),
      exportCell: (n) => n.kind,
    },
    {
      key: 'lifecycle',
      label: t('col.lifecycle'),
      sortable: true,
      sortAccessor: (n) => LIFECYCLE_PRIORITY[n.lifecycle ?? 'active'] ?? 99,
      filter: {
        kind: 'enum',
        options: NODE_LIFECYCLE_STATES.map((v) => ({
          value: v,
          label: t(`lifecycle.${v}`),
          icon: (
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-none',
                {
                  active: 'bg-emerald-600',
                  provisioning: 'bg-blue-500',
                  stopping: 'bg-amber-500',
                  stopped: 'bg-muted-foreground/60',
                  terminating: 'bg-destructive/70',
                  terminated: 'bg-muted-foreground/40',
                }[v],
              )}
            />
          ),
        })),
      },
      align: 'center',
      minWidthPx: 140,
      maxWidthPx: 220,
      render: (n) => (
        <RowActionMenu
          trigger={
            <button
              type="button"
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <HealthStatusBadge node={n} />
            </button>
          }
          actions={statusQuickActions}
          row={n}
          ariaLabel={t('col.actions')}
        />
      ),
      exportCell: (n) => n.lifecycle ?? '',
    },
    {
      key: 'health',
      label: t('col.health'),
      sortable: true,
      sortAccessor: (n) => n.health ?? 'unknown',
      filter: {
        kind: 'enum',
        options: NODE_HEALTH.map((v) => ({
          value: v,
          label: t(`health.${v}`),
        })),
      },
      defaultHidden: true,
      minWidthPx: 120,
      maxWidthPx: 180,
      render: (n) => (
        <span className="text-[11px] font-black uppercase tracking-widest">
          {t(`health.${n.health ?? 'unknown'}`)}
        </span>
      ),
      exportCell: (n) => n.health ?? 'unknown',
    },
    {
      key: 'cpuCores',
      label: t('col.cpu'),
      sortable: true,
      sortAccessor: (n) => n.cpuCores,
      filter: { kind: 'number' },
      width: '140px',
      minWidthPx: 120,
      maxWidthPx: 200,
      truncate: true,
      render: (n) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="tabular-nums text-sm shrink-0">
            {t('units.vcpuCount', { count: n.cpuCores })}
          </span>
          <HeatBar
            value={n.cpuCores}
            max={maxCpu}
            utilPct={n.cpuUtilPct}
            className="flex-1 min-w-[24px]"
            aria-label={t('aria.cpuHeatBar', {
              count: n.cpuCores,
              util: n.cpuUtilPct ?? 0,
            })}
          />
        </div>
      ),
      exportCell: (n) => String(n.cpuCores),
    },
    {
      key: 'memoryGb',
      label: t('col.memory'),
      sortable: true,
      sortAccessor: (n) => n.memoryGb,
      filter: { kind: 'number' },
      width: '150px',
      minWidthPx: 130,
      maxWidthPx: 220,
      truncate: true,
      render: (n) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="tabular-nums text-sm shrink-0">
            {t('units.gbCount', { count: n.memoryGb })}
          </span>
          <HeatBar
            value={n.memoryGb}
            max={maxMem}
            utilPct={n.memUtilPct}
            className="flex-1 min-w-[24px]"
            aria-label={t('aria.memoryHeatBar', {
              count: n.memoryGb,
              util: n.memUtilPct ?? 0,
            })}
          />
        </div>
      ),
      exportCell: (n) => `${n.memoryGb}`,
    },
    {
      key: 'tags',
      label: t('col.tags'),
      filter: { kind: 'text', accessor: (n) => n.tags.join(' ') },
      defaultHidden: true,
      render: (n) =>
        n.tags.length === 0 ? (
          <span className="text-muted-foreground text-xs">{t('common.none')}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {n.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className="bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary inline-flex cursor-pointer items-center gap-1 rounded-none px-1.5 py-0.5 text-[10px] transition-colors"
              >
                <Tag className="h-2.5 w-2.5" />
                {highlightSearchMatch(tag, debouncedSearch)}
              </button>
            ))}
          </div>
        ),
      exportCell: (n) => n.tags.join(';'),
    },
    {
      key: 'createdAt',
      label: t('col.created'),
      sortable: true,
      sortAccessor: (n) => new Date(n.createdAt),
      defaultHidden: true,
      minWidthPx: 120,
      maxWidthPx: 200,
      measureCell: (n) => new Date(n.createdAt).toLocaleDateString(),
      render: (n) => {
        const { date, time } = fmtDate(n.createdAt);
        return (
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-foreground/80 whitespace-nowrap text-xs">{date}</span>
            <span className="text-muted-foreground whitespace-nowrap text-[10px]">{time}</span>
          </div>
        );
      },
      exportCell: (n) => n.createdAt,
    },
    {
      key: 'updatedAt',
      label: t('col.updated'),
      sortable: true,
      sortAccessor: (n) => new Date(n.updatedAt),
      defaultHidden: true,
      minWidthPx: 120,
      maxWidthPx: 200,
      measureCell: (n) => new Date(n.updatedAt).toLocaleDateString(),
      render: (n) => {
        const { date, time } = fmtDate(n.updatedAt);
        return (
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-foreground/80 whitespace-nowrap text-xs">{date}</span>
            <span className="text-muted-foreground whitespace-nowrap text-[10px]">{time}</span>
          </div>
        );
      },
      exportCell: (n) => n.updatedAt,
    },
    {
      key: 'lastSeenAt',
      label: t('col.lastSeen'),
      sortable: true,
      sortAccessor: (n) => (n.lastSeenAt ? new Date(n.lastSeenAt) : new Date(0)),
      defaultHidden: false,
      align: 'left',
      minWidthPx: 110,
      maxWidthPx: 180,
      measureCell: (n) =>
        n.lastSeenAt ? new Date(n.lastSeenAt).toLocaleDateString() : t('common.none'),
      render: (n) => <LastSeenDot lastSeenAt={n.lastSeenAt} className="max-w-full overflow-hidden" />,
      exportCell: (n) => n.lastSeenAt ?? '',
    },
    {
      key: 'provider',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span>{t('col.provider')}</span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex h-6 w-6 items-center justify-center rounded-none border border-transparent hover:border-border hover:bg-muted/40"
                  aria-label={t('col.providerLegend.aria')}
                  onClick={(e) => e.preventDefault()}
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="rounded-none border-2 border-border px-3 py-2 shadow-xl">
                <div className="flex flex-col gap-1.5">
                  <div className="text-foreground text-[11px] font-black uppercase tracking-widest">
                    {t('col.providerLegend.title')}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {NODE_PROVIDERS.map((p) => (
                      <div key={p} className="flex items-center gap-2">
                        <ProviderIcon provider={p} size={14} minimal />
                        <span className="text-muted-foreground text-xs font-semibold">
                          {t(`provider.${p}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ),
      sortable: true,
      sortAccessor: (n) => n.provider ?? '',
      filter: {
        kind: 'enum',
        options: NODE_PROVIDERS.map((v) => ({
          value: v,
          label: t(`provider.${v}`),
          icon: <ProviderIcon provider={v} size={12} />,
        })),
      },
      defaultHidden: false,
      minWidthPx: 180,
      maxWidthPx: 260,
      render: (n) => {
        if (!n.provider) return <span className="text-muted-foreground text-xs">{t('common.none')}</span>;
        const s = PROVIDER_STYLES[n.provider];
        return (
          <div className="@container w-full">
            <span
              className={cn(
                'inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-none px-2 py-1 text-xs font-semibold',
                s.bg,
                s.text,
              )}
              title={t(`provider.${n.provider}`)}
            >
              <span className="shrink-0">
                <ProviderIcon provider={n.provider} size={14} minimal />
              </span>
              <span className="hidden @[110px]:inline min-w-0 flex-1 truncate">
                {t(`provider.${n.provider}`)}
              </span>
            </span>
          </div>
        );
      },
      exportCell: (n) => n.provider ?? '',
    },
    {
      key: 'cluster',
      label: t('col.cluster'),
      sortable: true,
      sortAccessor: (n) => n.cluster ?? '',
      filter: { kind: 'text', accessor: (n) => n.cluster ?? '' },
      defaultHidden: false,
      minWidthPx: 120,
      maxWidthPx: 220,
      truncate: true,
      render: (n) =>
        n.cluster ? (
          <span className="text-foreground/80 font-mono text-xs">{n.cluster}</span>
        ) : (
          <span className="text-muted-foreground text-xs">{t('common.none')}</span>
        ),
      exportCell: (n) => n.cluster ?? '',
    },
    {
      key: 'ip',
      label: t('col.ip'),
      filter: { kind: 'text', accessor: (n) => n.ip ?? '' },
      defaultHidden: true,
      minWidthPx: 110,
      maxWidthPx: 160,
      render: (n) =>
        n.ip ? (
          <span className="text-foreground/80 font-mono text-xs">{n.ip}</span>
        ) : (
          <span className="text-muted-foreground text-xs">{t('common.none')}</span>
        ),
      exportCell: (n) => n.ip ?? '',
    },
    {
      key: 'owner',
      label: t('col.owner'),
      sortable: true,
      sortAccessor: (n) => n.owner ?? '',
      filter: { kind: 'text', accessor: (n) => n.owner ?? '' },
      defaultHidden: true,
      minWidthPx: 160,
      maxWidthPx: 260,
      truncate: true,
      render: (n) =>
        n.owner ? (
          <span className="text-foreground/80 text-xs">{n.owner}</span>
        ) : (
          <span className="text-muted-foreground text-xs">{t('common.none')}</span>
        ),
      exportCell: (n) => n.owner ?? '',
    },
    {
      key: 'actions',
      label: t('col.actions'),
      required: true,
      align: 'center',
      width: '80px',
      minWidthPx: 80,
      maxWidthPx: 80,
      render: (n) => (
        <div
          className="flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <RowActionMenu actions={rowActions} row={n} ariaLabel={t('col.actions')} />
        </div>
      ),
      exportCell: () => '',
    },
  ];
}
