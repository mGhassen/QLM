import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckSquare,
  CircleStop,
  Cpu,
  Database,
  Droplets,
  Eye,
  Globe,
  Pencil,
  Play,
  Server,
  Trash2,
} from 'lucide-react';

import { Button } from '@guepard/ui/button';
import { Checkbox } from '@guepard/ui/checkbox';
import { RowActionMenu, type Action } from '@guepard/ui/action';
import { HeatSegmentBar } from '@guepard/ui/heat-segment-bar';
import { cn } from '@guepard/ui/utils';

import type {
  Node,
  NodeLifecycleState,
  NodeProvider,
} from '@guepard/domain/entities';
import {
  DISPLAY_BADGE_CLASSES,
  PROVIDER_STYLES,
} from '../../application/constants';
import { HealthStatusBadge } from '../cells/health-status-badge';
import { LastSeenDot } from '../cells/last-seen-dot';
import { ProviderIcon } from '../cells/provider-icon';
import { buildRowActions } from '../../application/use-actions';
import { getNodeDisplayState } from '../lib/get-node-display-state';

export type CardProps = Readonly<{
  node: Node;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean, shiftKey?: boolean) => void;
  onViewDetails?: (node: Node) => void;
  onSetLifecycle?: (id: string, lifecycle: NodeLifecycleState) => void | Promise<void>;
  onDrain?: (node: Node) => void;
  onCancelDrain?: (id: string) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onEdit?: (node: Node) => void;
  /** Extra className applied to card root for flash animations. */
  flashClass?: string;
}>;

const PROVIDER_BADGE = PROVIDER_STYLES;

function CardInner({
  node,
  selectionMode,
  selected,
  onSelect,
  onViewDetails,
  onSetLifecycle,
  onDrain,
  onCancelDrain,
  onDelete,
  onEdit,
  flashClass,
}: CardProps) {
  const { t } = useTranslation('nodes');
  const displayState = getNodeDisplayState(node);
  const badgeTone = DISPLAY_BADGE_CLASSES[displayState.kind] ?? '';
  /**
   * Heat-segment bar tone projection — the bar still ships with the
   * legacy 4-tone palette (running/draining/stopped/error). Map the
   * 8-kind displayState onto it. RFC §5.4 keeps presentation composites
   * UI-only; this mapping lives at the call site.
   */
  const heatTone: 'running' | 'draining' | 'stopped' | 'error' =
    displayState.kind === 'running'
      ? 'running'
      : displayState.kind === 'draining' || displayState.kind === 'degraded'
        ? 'draining'
        : displayState.kind === 'critical' ||
          displayState.kind === 'unreachable'
          ? 'error'
          : 'stopped';
  const rowActions: Action<Node>[] = useMemo(() => {
    const base = buildRowActions({
      t,
      onViewDetails: (n) => onViewDetails?.(n),
      onDelete: async (id) => onDelete?.(id),
      onSetLifecycle: async (id, lifecycle) =>
        onSetLifecycle?.(id, lifecycle),
      onDrain: (n) => onDrain?.(n),
      onCancelDrain: async (id) => onCancelDrain?.(id),
    });
    if (!selectionMode && onSelect) {
      return [
        {
          id: 'select',
          label: t('actions.select'),
          icon: CheckSquare,
          run: (ctx) => onSelect((ctx as Node).id, true),
        },
        ...base,
      ];
    }
    return base;
  }, [
    t,
    onViewDetails,
    onDelete,
    onSetLifecycle,
    onDrain,
    onCancelDrain,
    selectionMode,
    onSelect,
  ]);

  const handleCardClick = (e?: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      onSelect(node.id, !selected, e?.shiftKey);
    } else if (!selectionMode) {
      onViewDetails?.(node);
    }
  };

  const hasMiddleActions = !!(onEdit || onSetLifecycle || onDrain);
  const hasTopUtility = (!selectionMode && !!onSelect) || (!!selectionMode && !!onViewDetails);
  const hasTopActions = hasTopUtility || hasMiddleActions;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => handleCardClick(e)}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={cn(
        'relative bg-card rounded-none border p-4 flex flex-col gap-3 h-full',
        'cursor-pointer transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        '[container-type:inline-size]',
        selected
          ? 'border-primary bg-primary/15 industrial-shadow'
          : 'border-border/60 hover:bg-muted hover:border-foreground dark:hover:bg-muted/40',
        flashClass,
      )}
    >
      <style>{`
        @container (max-width: 250px) {
          .hide-label-compact { display: none; }
        }
        @container (max-width: 220px) {
          .hide-region-compact { display: none; }
        }
        @container (max-width: 170px) {
          .hide-status-text-compact { display: none; }
          .hide-ram-compact { display: none; }
          .hide-date-compact { display: none; }
        }
      `}</style>
      {/* Row 1: Identity (Icon + Name + Menu) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0 pr-8">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-none border transition-all',
              badgeTone,
            )}
            onClick={(e) => { if (selectionMode) e.stopPropagation(); }}
          >
            {selectionMode ? (
              <Checkbox
                checked={selected ?? false}
                onCheckedChange={(checked) => onSelect?.(node.id, checked === true)}
                onClick={(e) => e.stopPropagation()}
                aria-label={t('selectRow')}
                className="h-5 w-5 border-foreground/30 data-[state=checked]:border-primary"
              />
            ) : (
              <ProviderIcon provider={node.provider} size={28} minimal />
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-foreground text-[20px] font-bold leading-none truncate tracking-tight">
              {node.name}
            </p>
            <div className="flex items-center gap-2">
              <HealthStatusBadge node={node} />
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
          <RowActionMenu actions={rowActions} row={node} ariaLabel={t('actions')} />
        </div>
      </div>

      {/* Row 2: Resource Stats (CPU + RAM + Region)
          Each chip takes an equal slice of the row via flex-1 basis-0 so
          the trio always fills the full card width. Inner layout centers
          icon+number on the same baseline. */}
      <div className="flex flex-nowrap items-center gap-2 mt-4 min-w-0">
        <div className="bg-muted/50 text-foreground border border-border h-9 px-3 rounded-none flex items-center justify-center gap-1.5 flex-1 basis-0 min-w-0">
          <Cpu className="h-3 w-3 opacity-60 shrink-0" />
          <span className="text-sm font-bold tabular-nums tracking-tight leading-none">
            {node.cpuCores}
          </span>
          <span className="hide-label-compact text-[9px] font-bold uppercase tracking-tight opacity-60 leading-none">
            {t('cpu')}
          </span>
        </div>
        <div className="bg-muted/50 text-foreground border border-border h-9 px-3 rounded-none flex items-center justify-center gap-1.5 flex-1 basis-0 min-w-0 hide-ram-compact">
          <Database className="h-3 w-3 opacity-60 shrink-0" />
          <span className="text-sm font-bold tabular-nums tracking-tight leading-none">
            {node.memoryGb}
          </span>
          <span className="hide-label-compact text-[9px] font-bold uppercase tracking-tight opacity-60 leading-none">
            {t('gb')}
          </span>
        </div>
        <div className="bg-muted/50 text-foreground border border-border h-9 px-3 rounded-none flex items-center justify-center gap-1.5 flex-1 basis-0 min-w-0 hide-region-compact">
          <Globe className="h-3 w-3 opacity-60 shrink-0" />
          <span className="truncate text-[11px] font-bold uppercase tracking-tight leading-none">
            {node.region}
          </span>
        </div>
      </div>

      {/* Row 2b: M / C utilization heat bars — Nomad-style segmented fill,
          tone tracks the node's own status so a draining/error node reads
          the same as its badge. */}
      <div className="flex flex-col gap-1 mt-2 pb-12 min-w-0">
        <HeatSegmentBar
          label="M"
          pct={node.memUtilPct}
          tone={heatTone}
          ariaLabel={t('memoryHeatBar', {
            count: node.memoryGb,
            util: node.memUtilPct ?? 0,
          })}
        />
        <HeatSegmentBar
          label="C"
          pct={node.cpuUtilPct}
          tone={heatTone}
          ariaLabel={t('cpuHeatBar', {
            count: node.cpuCores,
            util: node.cpuUtilPct ?? 0,
          })}
        />
      </div>

      {/* Row 3: Absolute Footer (Last seen + Provider)
          36px-tall container matches the provider badge height so the
          date text centers vertically with the badge instead of hugging
          the bottom edge. Right gutter (`right-[7.5rem]`) keeps the label
          clear of the badge on narrow cards. */}
      <div className="absolute bottom-4 left-4 right-[7.5rem] h-9 flex items-center hide-date-compact min-w-0 overflow-hidden">
        <LastSeenDot
          lastSeenAt={node.lastSeenAt}
          showPrefix
          className="truncate"
        />
      </div>

      {node.provider && (() => {
        const p = PROVIDER_BADGE[node.provider];
        return (
          <div className={cn(
            'absolute bottom-4 right-4 flex items-center gap-2.5 px-4 h-9 rounded-none text-[11px] font-bold uppercase tracking-tight border border-current/20 bg-opacity-10 shadow-md transition-all',
            p.bg, p.text
          )}>
            <ProviderIcon provider={node.provider} size={22} minimal />
            <span className="hide-label-compact">{t(`provider.${node.provider}`)}</span>
          </div>
        );
      })()}
    </div>
  );
}

export const Card = memo(CardInner);
