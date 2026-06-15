import type { ReactNode } from 'react';

import { Button } from '@qlm/ui/button';
import { Empty } from '@qlm/ui/empty';

export type EntityEmptyFirstRunProps = Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}>;

export function EntityEmptyFirstRun({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  secondaryHref,
}: EntityEmptyFirstRunProps) {
  return (
    <Empty className="min-h-[280px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border">
          {icon}
        </div>
        <div>
          <p className="text-foreground text-base font-semibold">{title}</p>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            {description}
          </p>
        </div>
        {(primaryLabel || secondaryLabel) && (
          <div className="mt-2 flex items-center gap-2">
            {primaryLabel && onPrimary ? (
              <Button onClick={onPrimary} size="sm">
                {primaryLabel}
              </Button>
            ) : null}
            {secondaryLabel && secondaryHref ? (
              <Button variant="outline" size="sm" asChild>
                <a href={secondaryHref} target="_blank" rel="noreferrer">
                  {secondaryLabel}
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Empty>
  );
}

export type EntityEmptyFilteredProps = Readonly<{
  title: string;
  description: string;
  clearLabel: string;
  onClear: () => void;
}>;

export function EntityEmptyFiltered({
  title,
  description,
  clearLabel,
  onClear,
}: EntityEmptyFilteredProps) {
  return (
    <Empty className="min-h-[200px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
        <Button variant="outline" size="sm" onClick={onClear} className="mt-2">
          {clearLabel}
        </Button>
      </div>
    </Empty>
  );
}
