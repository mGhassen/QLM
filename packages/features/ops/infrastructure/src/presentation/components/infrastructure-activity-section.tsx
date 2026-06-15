import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDown } from 'lucide-react';
import { cn } from '@guepard/ui/utils';

import type { ActivitySource, ActivityRange, DataPoint } from '../../application/use-activity-data';
import { useActivityData } from '../../application/use-activity-data';

const DISK_IO_SPECS: Record<string, { baseline: number; max: number; burstMins: number; tier: string }> = {
  nano:   { baseline: 43,    max: 2_085, burstMins: 30, tier: 'NANO' },
  micro:  { baseline: 87,    max: 2_085, burstMins: 30, tier: 'MICRO' },
  small:  { baseline: 174,   max: 2_085, burstMins: 30, tier: 'SMALL' },
  medium: { baseline: 347,   max: 2_085, burstMins: 30, tier: 'MEDIUM' },
  large:  { baseline: 693,   max: 2_085, burstMins: 30, tier: 'LARGE' },
  xl:     { baseline: 1_386, max: 2_086, burstMins: 60, tier: 'XL' },
};

const SELECT_CLASS =
  'w-full border border-border bg-background h-10 text-[11px] font-bold uppercase tracking-tight px-3 pr-9 rounded-none cursor-pointer focus:outline-none focus:border-foreground appearance-none transition-colors';

type BarChartProps = {
  data: DataPoint[];
  title: string;
  unit?: string;
};

function ActivityBarChart({ data, title, unit = '%' }: BarChartProps) {
  const labelStep = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 5;

  return (
    <div className="border border-border bg-muted/15 p-5 rounded-none space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
        {title}
      </p>
      <div className="relative h-28">
        {[75, 50, 25].map((pct) => (
          <div
            key={pct}
            className="absolute inset-x-0 border-t border-border/30 pointer-events-none"
            style={{ bottom: `${pct}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((pt, i) => (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div
                className="w-full bg-foreground/60 hover:bg-foreground transition-all duration-150"
                style={{ height: `${Math.max(2, pt.value)}%` }}
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-foreground text-background px-2 py-1 pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-bold uppercase tracking-tight tabular-nums">
                  {pt.value}{unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-px border-t-2 border-border pt-1.5">
        {data.map((pt, i) => (
          <div key={i} className="flex-1 text-center overflow-hidden">
            {i % labelStep === 0 && (
              <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/60 leading-none">
                {pt.date}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="border border-border bg-muted/15 p-5 rounded-none space-y-4 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded-none" />
      <div className="h-28 bg-muted/40 rounded-none" />
    </div>
  );
}

type SectionProps = {
  title: string;
  description: string;
  note?: string;
  children: React.ReactNode;
};

function ActivityMetricSection({ title, description, note, children }: SectionProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start py-10 border-t-2 border-border">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {note && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">{note}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

type Props = Readonly<{
  projectId: string;
  computeTier: string;
}>;

export function InfrastructureActivitySection({ projectId, computeTier }: Props) {
  const { t } = useTranslation('infrastructure');
  const [source, setSource] = useState<ActivitySource>('primary');
  const [range, setRange] = useState<ActivityRange>('7d');
  const { data, isLoading } = useActivityData(projectId, source, range);

  const diskSpec = DISK_IO_SPECS[computeTier] ?? DISK_IO_SPECS['nano']!;

  const rangeLabel = (() => {
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 86_400_000);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  return (
    <div className="space-y-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-6 pb-6 border-b-2 border-border mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            {t('activity.source.label')}
          </span>
          <div className="relative w-40">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ActivitySource)}
              className={SELECT_CLASS}
            >
              <option value="primary">{t('activity.source.primary')}</option>
              <option value="replica">{t('activity.source.replica')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            {t('activity.range.label')}
          </span>
          <div className="relative w-32">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as ActivityRange)}
              className={SELECT_CLASS}
            >
              <option value="7d">{t('activity.range.7d')}</option>
              <option value="14d">{t('activity.range.14d')}</option>
              <option value="30d">{t('activity.range.30d')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60 ml-auto tabular-nums">
          {rangeLabel}
        </span>
      </div>

      {/* CPU */}
      <ActivityMetricSection
        title={t('activity.cpu.title')}
        description={t('activity.cpu.description')}
        note={t('activity.cpu.sharedNote')}
      >
        {isLoading || !data ? (
          <ChartSkeleton />
        ) : (
          <ActivityBarChart data={data.cpu} title={t('activity.cpu.chartTitle')} />
        )}
      </ActivityMetricSection>

      {/* Memory */}
      <ActivityMetricSection
        title={t('activity.memory.title')}
        description={t('activity.memory.description')}
        note={t('activity.memory.note')}
      >
        {isLoading || !data ? (
          <ChartSkeleton />
        ) : (
          <ActivityBarChart data={data.memory} title={t('activity.memory.chartTitle')} />
        )}
      </ActivityMetricSection>

      {/* Disk IO */}
      <ActivityMetricSection
        title={t('activity.diskIo.title')}
        description={t('activity.diskIo.description')}
        note={t('activity.diskIo.note')}
      >
        <div className="space-y-4">
          {isLoading || !data ? (
            <ChartSkeleton />
          ) : (
            <ActivityBarChart data={data.diskIo} title={t('activity.diskIo.chartTitle')} />
          )}
          <div className="border border-border rounded-none p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
              {t('activity.diskIo.overview')}
            </p>
            <div className="space-y-2">
              {[
                { label: t('activity.diskIo.instance'), value: diskSpec.tier },
                { label: t('activity.diskIo.baseline'), value: t('activity.diskIo.mbps', { value: diskSpec.baseline.toLocaleString() }) },
                { label: t('activity.diskIo.maximum'), value: t('activity.diskIo.mbps', { value: diskSpec.max.toLocaleString() }) },
                { label: t('activity.diskIo.burstTime'), value: t('activity.diskIo.mins', { value: diskSpec.burstMins }) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center justify-between py-1',
                    'border-b border-border/40 last:border-0',
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-tight">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ActivityMetricSection>
    </div>
  );
}
