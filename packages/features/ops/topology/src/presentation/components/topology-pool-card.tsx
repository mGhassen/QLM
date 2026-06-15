import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { CloudProviderIcon } from '@qlm/ui/cloud-provider-icon';
import {
  HeatSegmentBar,
  type HeatSegmentBarTone,
} from '@qlm/ui/heat-segment-bar';
import { cn } from '@qlm/ui/utils';

import type { NodeHealth } from '@qlm/domain/entities';

import type { TopologyPool } from '../../application/use-topology-data';

export type TopologyPoolCardProps = Readonly<{
  pool: TopologyPool;
  onClick?: (pool: TopologyPool) => void;
}>;

import {
  HEALTH_DOT,
  HEALTH_KEYS,
  PROVIDER_TONE,
} from '../../application/constants';

const FALLBACK_TONE = PROVIDER_TONE.unknown;

function TopologyPoolCardInner({ pool, onClick }: TopologyPoolCardProps) {
  const { t } = useTranslation('topology');
  const tone = PROVIDER_TONE[pool.provider] ?? FALLBACK_TONE;

  // Pool-level pressure = nodes-weighted average
  const totalCpuCores = pool.totalCpu;
  const totalMemGb = pool.totalMem;
  const usedCpu = pool.nodes.reduce(
    (acc, n) => acc + (n.cpuUtilPct ?? 0) * 0.01 * n.cpuCores,
    0,
  );
  const usedMem = pool.nodes.reduce(
    (acc, n) => acc + (n.memUtilPct ?? 0) * 0.01 * n.memoryGb,
    0,
  );
  const cpuPct = totalCpuCores > 0 ? Math.round((usedCpu / totalCpuCores) * 100) : 0;
  const memPct = totalMemGb > 0 ? Math.round((usedMem / totalMemGb) * 100) : 0;

  const dominantHealth = pickDominantHealth(pool);
  const dominantStatus = mapHealthToStatus(dominantHealth);
  const total = pool.nodes.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(pool)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(pool)}
      className={cn(
        'bg-card rounded-none border-2 border-border p-5 flex flex-col gap-5',
        'cursor-pointer transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'hover:bg-muted/40 hover:border-foreground',
      )}
    >
      {/* Header: provider icon + region/cluster + health status + node count */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-2 border-border/80',
            tone.bg,
          )}
        >
          <CloudProviderIcon provider={pool.provider} size={24} />
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-base font-black uppercase tracking-tight truncate leading-none">
            {pool.region}
          </span>
          {pool.cluster ? (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground truncate">
              {pool.cluster}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn('h-2.5 w-2.5 rounded-none shrink-0', HEALTH_DOT[dominantHealth])}
              aria-hidden
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t(`health.${dominantHealth}`)}
            </span>
          </div>
          <div className="bg-muted border-2 border-border/80 h-7 px-2.5 inline-flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-black tabular-nums leading-none">{total}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {t('pool.nodes')}
            </span>
          </div>
        </div>
      </div>

      {/* Resource panels: memory + CPU side by side */}
      <div className="grid grid-cols-2 gap-3">
        <ResourcePanel
          label={t('pool.totalMemory')}
          pct={memPct}
          tone={dominantStatus}
          used={usedMem}
          total={totalMemGb}
          unit={t('units.gb')}
          ariaLabel={t('pool.memPressure')}
        />
        <ResourcePanel
          label={t('pool.totalCpu')}
          pct={cpuPct}
          tone={dominantStatus}
          used={usedCpu}
          total={totalCpuCores}
          unit={t('units.vcpu')}
          ariaLabel={t('pool.cpuPressure')}
        />
      </div>

      {/* Health distribution: proportional stacked bar + legend */}
      <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
        <HealthProportionBar healthCounts={pool.healthCounts} total={total} />
        <div className="flex items-center gap-4">
          {HEALTH_KEYS.map((h) => {
            const count = pool.healthCounts[h] ?? 0;
            if (count === 0) return null;
            return (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-muted-foreground"
                aria-label={`${t(`health.${h}`)}: ${count}`}
              >
                <span className={cn('h-2 w-2 rounded-none shrink-0', HEALTH_DOT[h])} />
                <span className="font-black tabular-nums">{count}</span>
                <span className="uppercase tracking-widest opacity-70">
                  {t(`health.${h}`)}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ResourcePanelProps = Readonly<{
  label: string;
  pct: number;
  tone: HeatSegmentBarTone;
  used: number;
  total: number;
  unit: string;
  ariaLabel: string;
}>;

function ResourcePanel({ label, pct, tone, used, total, unit, ariaLabel }: ResourcePanelProps) {
  return (
    <div className="bg-muted border-2 border-border/80 p-3 rounded-none flex flex-col gap-2">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tighter tabular-nums leading-none">
          {pct}
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
          %
        </span>
      </div>
      <HeatSegmentBar
        pct={pct}
        tone={tone}
        heightClass="h-3"
        segments={24}
        ariaLabel={ariaLabel}
      />
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/70">
        {fmtNum(used)} / {total} {unit}
      </span>
    </div>
  );
}

type HealthProportionBarProps = Readonly<{
  healthCounts: TopologyPool['healthCounts'];
  total: number;
}>;

const HEALTH_BAR_COLOR: Record<NodeHealth, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  critical: 'bg-destructive',
  unknown: 'bg-muted-foreground/30',
};

function HealthProportionBar({ healthCounts, total }: HealthProportionBarProps) {
  if (total === 0) return null;
  return (
    <div
      className="flex h-2 w-full rounded-none overflow-hidden gap-px bg-border/40"
      role="img"
      aria-label="Health distribution"
    >
      {HEALTH_KEYS.map((h) => {
        const count = healthCounts[h] ?? 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={h}
            className={cn('h-full rounded-none', HEALTH_BAR_COLOR[h])}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

function pickDominantHealth(pool: TopologyPool): NodeHealth {
  if (pool.healthCounts.critical > 0) return 'critical';
  if (pool.healthCounts.degraded > 0) return 'degraded';
  if (pool.healthCounts.healthy > 0) return 'healthy';
  return 'unknown';
}

function mapHealthToStatus(health: NodeHealth): HeatSegmentBarTone {
  if (health === 'critical') return 'error';
  if (health === 'degraded') return 'draining';
  if (health === 'healthy') return 'running';
  return 'stopped';
}

function fmtNum(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export const TopologyPoolCard = memo(TopologyPoolCardInner);
