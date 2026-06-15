import { type ReactNode } from 'react';
import { ArrowRight, Clock, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Name cell: icon box + name + subtitle
// ---------------------------------------------------------------------------

export type EntityNameCellProps = {
  icon: LucideIcon;
  name: ReactNode;
  subtitle?: ReactNode;
  subtitleIcon?: LucideIcon;
  className?: string;
};

export function EntityNameCell({
  icon: Icon,
  name,
  subtitle,
  subtitleIcon: SubtitleIcon,
  className,
}: Readonly<EntityNameCellProps>) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="bg-muted/40 border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border">
        <Icon className="text-foreground/70 h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground truncate text-sm font-semibold">
          {name}
        </span>
        {subtitle && (
          <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            {SubtitleIcon && <SubtitleIcon className="h-3 w-3 shrink-0" />}
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date cell: clock icon + formatted date
// ---------------------------------------------------------------------------

export type EntityDateCellProps = {
  date: Date | string | number;
  format?: (date: Date) => string;
  className?: string;
};

const defaultDateFormatter = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

export function EntityDateCell({
  date,
  format = defaultDateFormatter,
  className,
}: Readonly<EntityDateCellProps>) {
  const d = date instanceof Date ? date : new Date(date);
  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-sm',
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{format(d)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow cell: right arrow for row action
// ---------------------------------------------------------------------------

export function EntityArrowCell({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-end', className)}>
      <ArrowRight className="text-muted-foreground h-4 w-4" />
    </div>
  );
}
