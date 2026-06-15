import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  ChevronRight,
  Cpu,
  Database,
  Layers,
} from 'lucide-react';

import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
} from '@qlm/ui/entity-sheet';
import { Button } from '@qlm/ui/button';
import { CloudProviderIcon } from '@qlm/ui/cloud-provider-icon';
import { cn } from '@qlm/ui/utils';

import type { Node, NodeHealth } from '@qlm/domain/entities';

import type { TopologyPool } from '../../application/use-topology-data';

export type TopologyPoolSheetProps = Readonly<{
  pool: TopologyPool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNode?: (node: Node) => void;
  /** Drill into Infrastructure filtered by this pool. */
  onDrillInto?: (pool: TopologyPool) => void;
}>;

import {
  HEALTH_DOT,
  HEALTH_KEYS,
  PROVIDER_TONE,
} from '../../application/constants';

function TopologyPoolSheetInner({
  pool,
  open,
  onOpenChange,
  onOpenNode,
  onDrillInto,
}: TopologyPoolSheetProps) {
  const { t } = useTranslation('topology');
  if (!pool) return null;

  const tone = PROVIDER_TONE[pool.provider] ?? PROVIDER_TONE.unknown;
  const providerLabel =
    pool.provider === 'unknown' ? t('pool.unknownProvider') : pool.provider;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="details">
      <EntitySheetHeader
        icon={<CloudProviderIcon provider={pool.provider} size={28} />}
        iconClassName={cn('h-12', tone.bg, 'border-border/80')}
        title={pool.region}
        description={
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3 w-3 opacity-60" />
            <span className="truncate">
              {pool.cluster ?? t('poolSheet.noCluster')}
            </span>
          </span>
        }
        meta={
          <div
            className={cn(
              'flex items-center gap-2 px-3 h-7 rounded-none text-[11px] font-black uppercase tracking-wider border-2 border-current/20',
              tone.bg,
              tone.text,
            )}
          >
            <CloudProviderIcon provider={pool.provider} size={12} />
            <span>{providerLabel}</span>
          </div>
        }
      />

      <EntitySheetBody>
        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Section: capacity */}
          <Section title={t('poolSheet.capacity')}>
            <div className="grid grid-cols-3 gap-2">
              <CapacityStat
                icon={<Cpu className="h-3 w-3 opacity-60" />}
                value={pool.totalCpu}
                unit={t('units.vcpu')}
                label={t('pool.totalCpu')}
              />
              <CapacityStat
                icon={<Database className="h-3 w-3 opacity-60" />}
                value={pool.totalMem}
                unit={t('units.gb')}
                label={t('pool.totalMemory')}
              />
              <CapacityStat
                icon={null}
                value={pool.nodes.length}
                label={t('poolSheet.nodes')}
              />
            </div>
          </Section>

          {/* Section: pressure */}
          <Section title={t('poolSheet.pressure')}>
            <div className="flex flex-col gap-3">
              <PressureBar
                label={t('pool.cpuPressure')}
                pct={pool.avgCpuUtil}
              />
              <PressureBar
                label={t('pool.memPressure')}
                pct={pool.avgMemUtil}
              />
            </div>
          </Section>

          {/* Section: health distribution */}
          <Section title={t('poolSheet.health')}>
            <HealthDistribution
              counts={pool.healthCounts}
              total={pool.nodes.length}
            />
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
              {HEALTH_KEYS.map((h) => (
                <div
                  key={h}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        'h-2.5 w-2.5 rounded-none border border-border/80',
                        HEALTH_DOT[h],
                      )}
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {t(`health.${h}`)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums font-black text-muted-foreground">
                    {pool.healthCounts[h] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: nodes */}
          <Section title={t('poolSheet.nodesIn')}>
            <ul className="flex flex-col gap-2">
              {pool.nodes.map((node) => (
                <PoolNodeRow
                  key={node.id}
                  node={node}
                  onClick={onOpenNode ? () => onOpenNode(node) : undefined}
                />
              ))}
            </ul>
          </Section>
        </div>
      </EntitySheetBody>

      {onDrillInto && (
        <EntitySheetFooter>
          <Button
            variant="default"
            className="w-full h-10 rounded-none font-black uppercase tracking-widest text-xs cursor-pointer"
            onClick={() => onDrillInto(pool)}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            {t('poolSheet.drillInto')}
          </Button>
        </EntitySheetFooter>
      )}
    </EntitySheet>
  );
}

type SectionProps = Readonly<{ title: string; children: React.ReactNode }>;
function Section({ title, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-3">
        {title}
        <span className="h-[2px] flex-1 bg-border" />
      </h3>
      {children}
    </div>
  );
}

type CapacityStatProps = Readonly<{
  icon: React.ReactNode;
  value: number;
  unit?: string;
  label: string;
}>;
function CapacityStat({ icon, value, unit, label }: CapacityStatProps) {
  return (
    <div className="bg-muted border-2 border-border/80 p-3 rounded-none flex flex-col gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black tracking-tighter tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

type PressureBarProps = Readonly<{ label: string; pct?: number }>;
function PressureBar({ label, pct }: PressureBarProps) {
  const value = pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  const tone =
    value > 80
      ? 'bg-destructive'
      : value > 60
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-mono tabular-nums font-black">
          {pct === undefined ? '—' : `${value}%`}
        </span>
      </div>
      <div className="h-2 w-full bg-background border-2 border-border/80 rounded-none">
        {pct !== undefined && (
          <div className={cn('h-full', tone)} style={{ width: `${value}%` }} />
        )}
      </div>
    </div>
  );
}

type HealthDistributionProps = Readonly<{
  counts: Record<NodeHealth, number>;
  total: number;
}>;
function HealthDistribution({ counts, total }: HealthDistributionProps) {
  return (
    <div
      className="h-3 w-full bg-muted border-2 border-border/80 rounded-none flex items-stretch overflow-hidden"
      role="img"
    >
      {total === 0 ? (
        <span className="flex-1" />
      ) : (
        HEALTH_KEYS.map((h) => {
          const c = counts[h] ?? 0;
          if (!c) return null;
          const pct = (c / total) * 100;
          return (
            <span
              key={h}
              className={cn('h-full', HEALTH_DOT[h])}
              style={{ width: `${pct}%` }}
              title={`${h}: ${c}`}
            />
          );
        })
      )}
    </div>
  );
}

type PoolNodeRowProps = Readonly<{
  node: Node;
  onClick?: () => void;
}>;
function PoolNodeRow({ node, onClick }: PoolNodeRowProps) {
  const { t } = useTranslation('topology');
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'w-full text-left bg-card border-2 border-border p-3 rounded-none flex items-center gap-3',
          onClick
            ? 'cursor-pointer hover:bg-muted/40 hover:border-foreground transition-colors'
            : 'cursor-default',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'h-3 w-3 shrink-0 rounded-none border-2 border-border/80',
            // Color the dot by derived health (the live signal); fallback
            // to the unknown tone when health is undefined.
            HEALTH_DOT[(node.health as NodeHealth | undefined) ?? 'unknown'],
          )}
        />
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <span className="text-sm font-black uppercase tracking-tight truncate">
            {node.name}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground bg-muted border border-border/80 h-5 px-1.5 rounded-none">
              <Cpu className="h-2.5 w-2.5 opacity-60" />
              {node.cpuCores} {t('units.vcpu')}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground bg-muted border border-border/80 h-5 px-1.5 rounded-none">
              <Database className="h-2.5 w-2.5 opacity-60" />
              {node.memoryGb} {t('units.gb')}
            </span>
          </div>
        </div>
        {onClick && (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
    </li>
  );
}

export const TopologyPoolSheet = memo(TopologyPoolSheetInner);
