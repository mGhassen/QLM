import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive } from 'lucide-react';

import { HeatSegmentBar } from '@qlm/ui/heat-segment-bar';
import { cn } from '@qlm/ui/utils';

import type { Node } from '@qlm/domain/entities';

import { EntitySection } from '@qlm/ui/entity-primitives';
import { toHeatTone } from '../lib/to-heat-tone';

export type NodeDetailStorageSectionProps = Readonly<{ node: Node }>;

function NodeDetailStorageSectionInner({
  node,
}: NodeDetailStorageSectionProps) {
  const { t } = useTranslation('nodes');
  const pct = node.diskUtilPct;
  const used =
    typeof pct === 'number' && typeof node.diskGb === 'number'
      ? Math.round((pct / 100) * node.diskGb * 10) / 10
      : undefined;

  // Empty state when neither disk capacity nor utilization is reported.
  if (node.diskGb === undefined && pct === undefined) {
    return (
      <EntitySection title={t('storage.title')}>
        <NodeDetailEmpty
          icon={<HardDrive className="text-muted-foreground h-6 w-6" />}
          title={t('storage.empty.title')}
          description={t('storage.empty.description')}
        />
      </EntitySection>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <EntitySection title={t('storage.utilization')}>
        <div className="flex flex-col gap-5 border border-border/40 bg-card/20 p-5 group hover:border-primary/30 transition-all transition-duration-500">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
                {t('storage.utilization')}
              </span>
              <span className="text-4xl font-bold tabular-nums tracking-tighter leading-none group-hover:text-primary transition-colors">
                {pct === undefined ? '—' : `${pct}%`}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 leading-none">
                {t('storage.gb')}
              </span>
              <span className="text-sm font-mono font-bold tabular-nums text-foreground/80">
                {used !== undefined && node.diskGb !== undefined ? (
                  <>
                    {used} <span className="opacity-40">/</span> {node.diskGb}
                  </>
                ) : '—'}
              </span>
            </div>
          </div>

          <HeatSegmentBar
            label="D"
            pct={pct}
            tone={toHeatTone(node)}
            ariaLabel={t('storage.utilization')}
            heightClass="h-4"
            segments={48}
          />
        </div>
      </EntitySection>

      <EntitySection title={t('storage.specs')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SpecCell
            icon={<HardDrive className="h-3.5 w-3.5 opacity-70" />}
            label={t('storage.totalDisk')}
            value={node.diskGb ?? '—'}
            unit={node.diskGb !== undefined ? t('storage.gb') : undefined}
          />
          <SpecCell
            label={t('col.region')}
            value={node.region ?? '—'}
          />
          <SpecCell
            label={t('col.kind')}
            value={node.kind}
          />
        </div>
      </EntitySection>
    </div>
  );
}

type SpecCellProps = Readonly<{
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
}>;

function SpecCell({ icon, label, value, unit }: SpecCellProps) {
  return (
    <div className="bg-card/30 border border-border/40 p-4 rounded-none flex flex-col gap-2 hover:border-primary/20 transition-colors">
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50',
          icon && 'inline-flex items-center gap-2',
        )}
      >
        {icon}
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums tracking-tighter leading-none truncate">
          {value}
        </span>
        {unit && (
          <span className="text-[10px] font-extrabold uppercase tracking-tight text-primary/60">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

type NodeDetailEmptyProps = Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
}>;

function NodeDetailEmpty({ icon, title, description }: NodeDetailEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border">
        {icon}
      </div>
      <p className="text-foreground text-base font-semibold">{title}</p>
      <p className="text-muted-foreground mx-auto max-w-md text-sm">
        {description}
      </p>
    </div>
  );
}

export const NodeDetailStorageSection = memo(NodeDetailStorageSectionInner);
