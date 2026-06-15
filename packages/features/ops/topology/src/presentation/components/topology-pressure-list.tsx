import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Cpu, Database, ServerOff } from 'lucide-react';

import type { PressurePoint } from '@guepard/domain/usecases';
import { cn } from '@guepard/ui/utils';

export type TopologyPressureListProps = Readonly<{
  points: readonly PressurePoint[];
  onSelect?: (nodeId: string) => void;
  /** Cap how many entries we render before collapsing to a "+N more" hint. */
  maxVisible?: number;
}>;

const KIND_LABEL_KEY: Record<PressurePoint['kind'], string> = {
  unreachable: 'pressure.unreachable',
  failing: 'pressure.failing',
  criticalHealth: 'pressure.criticalHealth',
  highCpu: 'pressure.highCpu',
  highMem: 'pressure.highMem',
};

const KIND_TONE: Record<PressurePoint['kind'], string> = {
  unreachable: 'bg-destructive/10 border-destructive/30 text-destructive',
  failing: 'bg-destructive/10 border-destructive/30 text-destructive',
  criticalHealth: 'bg-destructive/10 border-destructive/30 text-destructive',
  highCpu:
    'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
  highMem:
    'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
};

/**
 * Presence-marker kinds carry `value: 1` (sentinel). Utilization kinds
 * carry the observed pct (0-100) and append " · NN%" to the label.
 */
const PRESENCE_KINDS = new Set<PressurePoint['kind']>([
  'unreachable',
  'failing',
  'criticalHealth',
]);

function PressureIcon({ kind }: { kind: PressurePoint['kind'] }) {
  if (kind === 'unreachable' || kind === 'failing')
    return <ServerOff className="h-3.5 w-3.5 shrink-0" />;
  if (kind === 'highMem')
    return <Database className="h-3.5 w-3.5 shrink-0" />;
  return <Cpu className="h-3.5 w-3.5 shrink-0" />;
}

function TopologyPressureListInner({
  points,
  onSelect,
  maxVisible = 5,
}: TopologyPressureListProps) {
  const { t } = useTranslation('topology');
  const visible = points.slice(0, maxVisible);
  const hidden = Math.max(0, points.length - visible.length);

  return (
    <div className="bg-card border-2 border-border p-4 rounded-none flex flex-col gap-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-3">
        {t('pressure.title')}
        <span className="h-[2px] flex-1 bg-border" />
      </h3>
      <ul className="flex flex-col gap-2">
        {visible.map((point) => {
          const interactive = Boolean(onSelect);
          const Element = interactive ? 'button' : 'div';
          return (
            <li key={`${point.kind}:${point.nodeId}`}>
              <Element
                {...(interactive
                  ? {
                      type: 'button',
                      onClick: () => onSelect?.(point.nodeId),
                    }
                  : {})}
                className={cn(
                  'group flex items-center gap-2.5 rounded-none border-2 px-2.5 py-2 w-full text-left transition-colors',
                  KIND_TONE[point.kind],
                  interactive
                    ? 'cursor-pointer hover:opacity-90'
                    : 'cursor-default',
                )}
              >
                <PressureIcon kind={point.kind} />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {t(KIND_LABEL_KEY[point.kind])}
                    {!PRESENCE_KINDS.has(point.kind) ? ` · ${point.value}%` : null}
                  </span>
                  <span className="text-xs font-mono tabular-nums truncate">
                    {point.nodeName}
                  </span>
                </div>
                {interactive && (
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                )}
              </Element>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t('pressure.more', { count: hidden })}
        </p>
      )}
    </div>
  );
}

export const TopologyPressureList = memo(TopologyPressureListInner);
