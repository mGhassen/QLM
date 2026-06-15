import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HeatSegmentBar } from '@guepard/ui/heat-segment-bar';

import type { Node } from '@guepard/domain/entities';

import { EntitySection } from '@guepard/ui/entity-primitives';
import { toHeatTone } from '../lib/to-heat-tone';

export type NodeDetailMemorySectionProps = Readonly<{ node: Node }>;

function NodeDetailMemorySectionInner({ node }: NodeDetailMemorySectionProps) {
  const { t } = useTranslation('nodes');
  const pct = node.memUtilPct;
  const used =
    typeof pct === 'number' ? Math.round((pct / 100) * node.memoryGb * 10) / 10 : undefined;

  return (
    <EntitySection title={t('detail.memory.utilization')}>
      <div className="flex flex-col gap-5 border border-border/40 bg-card/20 p-5 group hover:border-primary/30 transition-all transition-duration-500">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
              {t('detail.memory.utilization')}
            </span>
            <span className="text-4xl font-bold tabular-nums tracking-tighter leading-none group-hover:text-primary transition-colors">
              {pct === undefined ? '—' : `${pct}%`}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
              {t('gb')}
            </span>
            <span className="text-sm font-mono font-bold tabular-nums text-foreground/80">
              {used !== undefined ? (
                <>
                  {used} <span className="opacity-40">/</span> {node.memoryGb}
                </>
              ) : '—'}
            </span>
          </div>
        </div>

        <HeatSegmentBar
          label="M"
          pct={pct}
          tone={toHeatTone(node)}
          ariaLabel={t('detail.memory.utilization')}
          heightClass="h-4"
          segments={48}
        />

        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/30">
          <span>0%</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-primary/40" />
            <span>Memory Buffer Optimized</span>
          </div>
          <span>100%</span>
        </div>
      </div>
    </EntitySection>
  );
}

export const NodeDetailMemorySection = memo(NodeDetailMemorySectionInner);
