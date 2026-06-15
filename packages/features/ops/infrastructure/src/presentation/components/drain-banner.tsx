import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NodeDrain } from '@qlm/domain/entities';
import { Button } from '@qlm/ui/button';
import { cn } from '@qlm/ui/utils';

export type DrainBannerProps = Readonly<{
  drain: NodeDrain;
  onCancel?: () => void;
  isCancelling?: boolean;
  /**
   * If `drain.deadline` is set but the orchestrator hasn't reported any
   * progress for >5 minutes, surface a "stalled" message rather than a
   * countdown that runs negative.
   */
  isStalled?: boolean;
  className?: string;
}>;

function DrainBannerInner({
  drain,
  onCancel,
  isCancelling,
  isStalled,
  className,
}: DrainBannerProps) {
  const { t } = useTranslation('nodes');
  const remaining = useRemainingFromDeadline(drain.deadline);

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-4 border border-amber-500/40 bg-amber-500/10 px-4 py-3 rounded-none',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-2.5 w-2.5 rounded-none bg-amber-500 animate-pulse shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400 leading-none">
            {t('drain.banner.draining')}
          </span>
          <span className="text-xs font-semibold text-amber-700/90 dark:text-amber-300/90 mt-1 truncate">
            {isStalled
              ? t('drain.banner.stalled')
              : drain.deadline
                ? t('drain.banner.deadline', { remaining })
                : t('drain.banner.deadlineNone')}
          </span>
        </div>
      </div>
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          disabled={isCancelling}
          onClick={onCancel}
          className="h-8 rounded-none border font-bold uppercase tracking-tight text-[11px] cursor-pointer"
        >
          {t('drain.banner.cancel')}
        </Button>
      )}
    </div>
  );
}

export const DrainBanner = memo(DrainBannerInner);

function useRemainingFromDeadline(deadline: string | undefined): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (!deadline) return '';
  const ms = new Date(deadline).getTime() - now;
  return formatRemaining(ms);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}
