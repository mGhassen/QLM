import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@qlm/ui/utils';

export type LastSeenDotProps = Readonly<{
  /** ISO string or undefined for nodes that have never phoned home. */
  lastSeenAt?: string;
  /** Trailing relative label — set to false for tight table cells. */
  showLabel?: boolean;
  /**
   * Prefix the label with the translated "Last seen" token (e.g. on cards
   * where the column header isn't adjacent). Off by default because table
   * cells get the label from the column header.
   */
  showPrefix?: boolean;
  className?: string;
}>;

type Bucket = 'fresh' | 'recent' | 'stale' | 'cold' | 'never';

const BUCKET_STYLES: Record<Bucket, string> = {
  fresh: 'bg-emerald-500 animate-pulse',
  recent: 'bg-emerald-500',
  stale: 'bg-amber-500',
  cold: 'bg-destructive',
  never: 'bg-muted-foreground/30',
};

function bucketFor(lastSeenAt: string | undefined): Bucket {
  if (!lastSeenAt) return 'never';
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  if (ageMs < 60_000) return 'fresh'; // < 1m
  if (ageMs < 5 * 60_000) return 'recent'; // < 5m
  if (ageMs < 60 * 60_000) return 'stale'; // < 1h
  return 'cold';
}

/**
 * Colored dot + optional relative label for `lastSeenAt`. Dot color tracks
 * freshness bucket (fresh/recent/stale/cold/never). Tooltip reveals the
 * absolute timestamp. Lets a scanner parse thousands of rows at a glance
 * instead of reading ISO strings.
 */
function LastSeenDotInner({
  lastSeenAt,
  showLabel = true,
  showPrefix = false,
  className,
}: LastSeenDotProps) {
  const { t } = useTranslation('nodes');
  const bucket = bucketFor(lastSeenAt);
  const relative = lastSeenAt
    ? formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })
    : t('col.lastSeenNever');
  const title = lastSeenAt
    ? new Date(lastSeenAt).toLocaleString()
    : t('col.lastSeenNever');

  return (
    <span
      role="status"
      aria-label={t('aria.lastSeen', { when: relative })}
      title={title}
      className={cn('inline-flex items-start gap-2 min-w-0', className)}
    >
      {/* Wrapper matches first-line line-height so the dot stays aligned
          with the first line of a wrapping label instead of drifting to
          the middle of the wrapped block. */}
      <span className="inline-flex h-[16px] items-center shrink-0">
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-none',
            BUCKET_STYLES[bucket],
          )}
        />
      </span>
      {showLabel && (
        <span className="text-muted-foreground text-[11px] font-mono leading-4 truncate min-w-0">
          {showPrefix && (
            <span className="hide-label-compact mr-1">
              {t('labels.lastSeenPrefix')}
            </span>
          )}
          <span>{relative}</span>
        </span>
      )}
    </span>
  );
}

export const LastSeenDot = memo(LastSeenDotInner);
