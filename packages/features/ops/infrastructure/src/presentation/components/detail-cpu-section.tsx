import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { HeatSegmentBar } from '@qlm/ui/heat-segment-bar';

import type { Node } from '@qlm/domain/entities';

import { EntitySection } from '@qlm/ui/entity-primitives';
import { toHeatTone } from '../lib/to-heat-tone';

export type NodeDetailCpuSectionProps = Readonly<{ node: Node }>;

function NodeDetailCpuSectionInner({ node }: NodeDetailCpuSectionProps) {
  const { t } = useTranslation('nodes');
  const pct = node.cpuUtilPct;
  const used =
    typeof pct === 'number' ? Math.round((pct / 100) * node.cpuCores * 10) / 10 : undefined;

  return (
    <EntitySection title={t('detail.cpu.utilization')}>
      <div className="flex flex-col gap-5 border border-border/40 bg-card/20 p-5 group hover:border-primary/30 transition-all transition-duration-500">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
              {t('detail.cpu.utilization')}
            </span>
            <span className="text-4xl font-bold tabular-nums tracking-tighter leading-none group-hover:text-primary transition-colors">
              {pct === undefined ? '—' : `${pct}%`}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
              {t('vcpu')}
            </span>
            <span className="text-sm font-mono font-bold tabular-nums text-foreground/80">
              {used !== undefined ? (
                <>
                  {used} <span className="opacity-40">/</span> {node.cpuCores}
                </>
              ) : '—'}
            </span>
          </div>
        </div>

        <HeatSegmentBar
          label="C"
          pct={pct}
          tone={toHeatTone(node)}
          ariaLabel={t('detail.cpu.utilization')}
          heightClass="h-4"
          segments={48}
        />

        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/30">
          <span>0%</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-primary/40" />
            <span>System Diagnostic Active</span>
          </div>
          <span>100%</span>
        </div>
      </div>
    </EntitySection>
  );
}

export const NodeDetailCpuSection = memo(NodeDetailCpuSectionInner);
