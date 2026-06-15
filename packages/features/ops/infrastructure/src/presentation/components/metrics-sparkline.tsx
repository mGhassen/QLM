import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import type { MetricsPoint } from '@guepard/domain/entities';
import { useShell } from '@guepard/shell-runtime';
import { Skeleton } from '@guepard/ui/skeleton';
import { cn } from '@guepard/ui/utils';

export type MetricsSparklineProps = Readonly<{
  nodeId: string;
  className?: string;
  hideLegend?: boolean;
}>;

type Series = 'cpu' | 'mem';

const SERIES_COLORS: Record<Series, string> = {
  cpu: 'stroke-emerald-500',
  mem: 'stroke-sky-500',
};

const SERIES_FILL: Record<Series, string> = {
  cpu: 'fill-emerald-500/10',
  mem: 'fill-sky-500/10',
};

/**
 * Dual-series sparkline (CPU + memory) rendered as inline SVG — no extra
 * dependency beyond what the feature already ships. 60 points across the
 * last 24h. Fetches lazily: query only runs when the component mounts,
 * so opening the detail sheet is what triggers the `/nodes/:id/metrics`
 * call, not the list page.
 */
function MetricsSparklineInner({
  nodeId,
  className,
  hideLegend,
}: MetricsSparklineProps) {
  const { t } = useTranslation('nodes');
  const shell = useShell();
  const { data, isLoading, isError } = useQuery({
    queryKey: shell.nodes.keys.metrics(nodeId, '24h'),
    queryFn: () => shell.nodes.metrics(nodeId, '24h'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Skeleton className={cn('h-24 w-full rounded-none', className)} />;
  }
  if (isError || !data || data.length === 0) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex h-24 w-full items-center justify-center border border-dashed border-border text-[11px] font-bold uppercase tracking-tight',
          className,
        )}
      >
        {t('metricsUnavailable')}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideLegend && (
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight">
          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-none bg-emerald-500" aria-hidden />
            {t('details.metricsCpu')}
          </span>
          <span className="text-sky-600 dark:text-sky-400 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-none bg-sky-500" aria-hidden />
            {t('details.metricsMem')}
          </span>
          <span className="text-muted-foreground ml-auto text-[9px]">
            {t('details.metricsMockNotice')}
          </span>
        </div>
      )}
      <SparklineChart points={data} ariaLabel={t('metricsAriaLabel')} />
    </div>
  );
}

function SparklineChart({
  points,
  ariaLabel,
}: {
  points: MetricsPoint[];
  ariaLabel: string;
}) {
  const width = 320;
  const height = 80;
  const padding = 4;

  const pathData = useMemo(() => {
    const n = points.length;
    const stepX = (width - padding * 2) / Math.max(1, n - 1);
    const build = (pick: Series) => {
      const coords = points.map((p, i) => {
        const x = padding + i * stepX;
        const y = padding + (height - padding * 2) * (1 - p[pick] / 100);
        return { x, y };
      });
      const line = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
        .join(' ');
      const first = coords[0]!;
      const last = coords[coords.length - 1]!;
      const area = `${line} L${last.x.toFixed(2)},${height - padding} L${first.x.toFixed(2)},${height - padding} Z`;
      return { line, area };
    };
    return {
      cpu: build('cpu'),
      mem: build('mem'),
    };
  }, [points]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className="h-20 w-full"
    >
      <path d={pathData.mem.area} className={cn(SERIES_FILL.mem)} strokeWidth={0} />
      <path
        d={pathData.mem.line}
        className={cn(SERIES_COLORS.mem)}
        strokeWidth={1.5}
        fill="none"
      />
      <path d={pathData.cpu.area} className={cn(SERIES_FILL.cpu)} strokeWidth={0} />
      <path
        d={pathData.cpu.line}
        className={cn(SERIES_COLORS.cpu)}
        strokeWidth={1.5}
        fill="none"
      />
    </svg>
  );
}

export const MetricsSparkline = memo(MetricsSparklineInner);
