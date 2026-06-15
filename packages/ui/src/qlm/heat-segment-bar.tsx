import { memo } from 'react';

import { cn } from '../lib/utils';

export type HeatSegmentBarTone = 'running' | 'draining' | 'stopped' | 'error';

export type HeatSegmentBarProps = Readonly<{
  /** Single-letter prefix label (e.g. 'M' for memory, 'C' for CPU). */
  label?: string;
  /** Utilization percentage (0–100). `undefined` renders an empty bar. */
  pct: number | undefined;
  /** Tone drives segment fill color. */
  tone?: HeatSegmentBarTone;
  /** Number of discrete segments. Default 24. */
  segments?: number;
  /** Bar height class. Default `h-3`. */
  heightClass?: string;
  ariaLabel?: string;
  className?: string;
}>;

const TONE_FILL: Record<HeatSegmentBarTone, string> = {
  running: 'bg-emerald-500',
  draining: 'bg-amber-500',
  stopped: 'bg-muted-foreground/40',
  error: 'bg-destructive',
};

/**
 * Nomad-style segmented utilization bar. Renders `segments` evenly-spaced
 * cells, fills the leading portion proportional to `pct`. Used in the
 * topology pool card (pool-level pressure) and the nodes grid card
 * (per-node M/C). Color is driven by the parent's status tone, not by
 * threshold — keeps cards visually consistent with their status badge.
 */
function HeatSegmentBarInner({
  label,
  pct,
  tone = 'running',
  segments = 24,
  heightClass = 'h-3',
  ariaLabel,
  className,
}: HeatSegmentBarProps) {
  const filled = pct === undefined ? 0 : Math.round((pct / 100) * segments);
  const fill = TONE_FILL[tone];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-muted-foreground w-3 shrink-0 text-[9px] font-black tracking-widest uppercase">
          {label}
        </span>
      )}
      <div
        className={cn(
          'bg-muted border-border/80 flex flex-1 items-stretch gap-px rounded-none border p-px',
          heightClass,
        )}
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-none',
              i < filled ? fill : 'bg-transparent',
            )}
          />
        ))}
      </div>
    </div>
  );
}

export const HeatSegmentBar = memo(HeatSegmentBarInner);
