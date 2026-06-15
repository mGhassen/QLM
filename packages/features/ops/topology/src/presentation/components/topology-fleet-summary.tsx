import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

import { cn } from '@qlm/ui/utils';

import type { FleetSummary, PressurePoint } from '@qlm/domain/usecases';

import { HEALTH_DOT, HEALTH_KEYS } from '../../application/constants';
import { TopologyPressureList } from './topology-pressure-list';

export type TopologyFleetSummaryProps = Readonly<{
  summary: FleetSummary;
  pressurePoints?: readonly PressurePoint[];
  /** Drill into nodes filtered by status:in:[error,draining]. */
  onAttentionClick?: () => void;
  /** Drill into a specific node's detail page. */
  onPressureSelect?: (nodeId: string) => void;
}>;

type TopologySectionHeadingProps = Readonly<{ title: string }>;
function TopologySectionHeading({ title }: TopologySectionHeadingProps) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-3">
      {title}
      <span className="h-[2px] flex-1 bg-border" />
    </h3>
  );
}

type SectionProps = Readonly<{ title: string; children: React.ReactNode }>;
function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-card border-2 border-border p-4 rounded-none flex flex-col gap-3">
      <TopologySectionHeading title={title} />
      {children}
    </div>
  );
}

type StatProps = Readonly<{ label: string; value: number }>;
function Stat({ label, value }: StatProps) {
  return (
    <div className="bg-muted border-2 border-border/80 p-2 rounded-none flex flex-col items-center gap-1">
      <span className="text-2xl font-black tracking-tighter tabular-nums leading-none">
        {value}
      </span>
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

type BigStatProps = Readonly<{
  label: string;
  value: number;
  unit: string;
  utilPct?: number;
  utilLabel: string;
}>;
function BigStat({ label, value, unit, utilPct, utilLabel }: BigStatProps) {
  return (
    <div className="bg-muted border-2 border-border/80 p-3 rounded-none flex flex-col gap-2">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tighter tabular-nums leading-none">
          {value}
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
          {unit}
        </span>
      </div>
      {utilPct !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {utilLabel}
            </span>
            <span className="text-[10px] font-mono tabular-nums font-black">
              {utilPct}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-background border border-border/80 rounded-none">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.max(0, Math.min(100, utilPct))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TopologyFleetSummaryInner({
  summary,
  pressurePoints = [],
  onAttentionClick,
  onPressureSelect,
}: TopologyFleetSummaryProps) {
  const { t } = useTranslation('topology');
  // Attention = nodes the operator should look at: anything critical or
  // degraded by the derived health axis. Replaces the legacy
  // `error + draining` heuristic.
  const attentionCount =
    summary.healthCounts.critical + summary.healthCounts.degraded;
  const isHealthy = attentionCount === 0;

  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
      {!isHealthy && onAttentionClick && (
        <button
          type="button"
          onClick={onAttentionClick}
          className="group flex items-center gap-3 rounded-none border-2 px-3 py-2.5 w-full text-left transition-colors cursor-pointer bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-2xl font-black tabular-nums leading-none">
              {attentionCount}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
              {t('fleet.attention.subtitle', { count: attentionCount })}
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
        </button>
      )}

      {pressurePoints.length > 0 && (
        <TopologyPressureList
          points={pressurePoints}
          onSelect={onPressureSelect}
        />
      )}

      <Section title={t('fleet.distribution')}>
        <div className="flex flex-col gap-2">
          {HEALTH_KEYS.map((h) => (
            <div key={h} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    'h-3 w-3 rounded-none border-2 border-border/80',
                    HEALTH_DOT[h],
                  )}
                />
                <span className="text-[11px] font-black uppercase tracking-widest">
                  {t(`health.${h}`)}
                </span>
              </div>
              <span className="text-[11px] font-mono tabular-nums font-black text-muted-foreground">
                {summary.healthCounts[h] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex flex-col gap-3">
        <TopologySectionHeading title={t('fleet.structure')} />
        <div className="grid grid-cols-3 gap-2">
          <Stat label={t('fleet.providers')} value={summary.providers} />
          <Stat label={t('fleet.regions')} value={summary.regions} />
          <Stat label={t('fleet.clusters')} value={summary.clusters} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TopologySectionHeading title={t('fleet.capacity')} />

        <BigStat
          label={t('fleet.totalMemory')}
          value={summary.totalMem}
          unit={t('units.gb')}
          utilPct={summary.avgMemUtil}
          utilLabel={t('fleet.avgUtil')}
        />
        <BigStat
          label={t('fleet.totalCpu')}
          value={summary.totalCpu}
          unit={t('units.vcpu')}
          utilPct={summary.avgCpuUtil}
          utilLabel={t('fleet.avgUtil')}
        />
      </div>
    </aside>
  );
}

export const TopologyFleetSummary = memo(TopologyFleetSummaryInner);
