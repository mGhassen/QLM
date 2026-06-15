/**
 * Lightweight "2 minutes ago" formatter backed by native Intl.RelativeTimeFormat.
 *
 * Kept local to this package so presentational components don't pull date-fns
 * just for one call site. If later the app wants a different humaniser, the
 * plugin-app layer can override by formatting dates into strings before
 * passing them in (all date-receiving components accept formatted strings too).
 */
export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  if (abs < 3600) {
    return rtf.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (abs < 86_400) {
    return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  }
  if (abs < 2_592_000) {
    return rtf.format(Math.round(diffSeconds / 86_400), 'day');
  }
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
