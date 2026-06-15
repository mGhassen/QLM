import { AlertTriangle, RefreshCcw } from 'lucide-react';

import { Button } from '@guepard/ui/button';

export type EntityErrorBannerProps = Readonly<{
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}>;

export function EntityErrorBanner({
  title,
  description,
  retryLabel,
  onRetry,
}: EntityErrorBannerProps) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-3 rounded-none border p-4"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1">
        <RefreshCcw className="h-3.5 w-3.5" />
        {retryLabel}
      </Button>
    </div>
  );
}
