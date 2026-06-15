import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Node, NodeHealth } from '@guepard/domain/entities';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@guepard/ui/tooltip';
import { cn } from '@guepard/ui/utils';

export type TopologyHostMapProps = Readonly<{
  rows: Node[];
  /** Navigation handoff. Topology stays read-only; consumer decides where to route. */
  onOpenNode?: (node: Node) => void;
  className?: string;
}>;

const TILE_PX = 18;

import { HEALTH_KEYS, HEALTH_TILE } from '../../application/constants';

function TopologyHostMapInner({
  rows,
  onOpenNode,
  className,
}: TopologyHostMapProps) {
  const { t } = useTranslation('topology');

  const healthCounts = useMemo(() => {
    const counts: Record<NodeHealth, number> = {
      healthy: 0,
      degraded: 0,
      critical: 0,
      unknown: 0,
    };
    for (const n of rows) counts[(n.health as NodeHealth | undefined) ?? 'unknown']++;
    return counts;
  }, [rows]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
        {HEALTH_KEYS.map((h) => (
          <span key={h} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('h-2 w-2 rounded-none', HEALTH_TILE[h].bg)}
            />
            <span>
              {t(`health.${h}`)}{' '}
              <span className="text-muted-foreground tabular-nums">
                {healthCounts[h]}
              </span>
            </span>
          </span>
        ))}
        <span className="text-muted-foreground ml-auto tabular-nums">
          {rows.length}
        </span>
      </div>

      <TooltipProvider delayDuration={100}>
        <div
          role="list"
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_PX}px, 1fr))`,
          }}
        >
          {rows.map((node) => {
            const health =
              (node.health as NodeHealth | undefined) ?? 'unknown';
            const tile = HEALTH_TILE[health];
            const display = t(`health.${health}`);
            return (
              <Tooltip key={node.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="listitem"
                    aria-label={t('hostMap.tileAriaLabel', {
                      name: node.name,
                      status: display,
                    })}
                    onClick={() => onOpenNode?.(node)}
                    className={cn(
                      'aspect-square w-full cursor-pointer rounded-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      tile.bg,
                      tile.hover,
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="rounded-none border-2 font-mono text-[11px]"
                >
                  <div className="font-black uppercase tracking-widest">
                    {node.name}
                  </div>
                  <div className="text-muted-foreground">
                    {display} · {node.region} ·{' '}
                    {t('units.vcpuCount', { count: node.cpuCores })}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}

export const TopologyHostMap = memo(TopologyHostMapInner);
