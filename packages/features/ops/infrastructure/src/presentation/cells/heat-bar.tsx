import { memo } from 'react';

import { cn } from '@qlm/ui/utils';

export type HeatBarProps = Readonly<{
  /** Current value (unbounded — compared against `max` for fill ratio). */
  value: number;
  /**
   * Max value used for the fill ratio. Callers pass the max of the
   * visible set so bars are comparable within a view, not absolute.
   * If 0 or undefined, bar renders empty.
   */
  max?: number;
  /**
   * Optional utilization percentage (0-100). When present, the bar color
   * ramps from muted → amber → destructive at higher utilization. Falls
   * back to a neutral fill when undefined.
   */
  utilPct?: number;
  className?: string;
  'aria-label'?: string;
}>;

function colorFor(utilPct: number | undefined): string {
  if (utilPct == null) return 'bg-foreground/30';
  if (utilPct >= 85) return 'bg-destructive';
  if (utilPct >= 65) return 'bg-amber-500';
  return 'bg-emerald-500/70';
}

/**
 * Tiny inline horizontal bar. Used under numeric columns (CPU / RAM) so
 * relative sizing is scannable without reading digits. Width tracks
 * `value / max`; color ramps with `utilPct` when provided.
 */
function HeatBarInner({
  value,
  max,
  utilPct,
  className,
  'aria-label': ariaLabel,
}: HeatBarProps) {
  const denom = max && max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / denom));
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max ?? value}
      className={cn(
        'relative h-[6px] w-full bg-muted/20 border border-border/60 rounded-none overflow-visible',
        className,
      )}
    >
      <div
        className={cn('absolute inset-y-0 left-0 transition-all duration-300', colorFor(utilPct))}
        style={{ width: `${ratio * 100}%` }}
      >
        {/* Tactical End Marker */}
        <div className="absolute right-0 top-[-2px] bottom-[-2px] w-[2px] bg-foreground/80 shadow-[0_0_4px_rgba(0,0,0,0.2)]" />
      </div>
    </div>
  );
}

export const HeatBar = memo(HeatBarInner);
