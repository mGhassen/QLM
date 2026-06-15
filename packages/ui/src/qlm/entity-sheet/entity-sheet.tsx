import type { ReactNode } from 'react';

import { Sheet, SheetContent } from '@qlm/ui/sheet';
import { cn } from '@qlm/ui/utils';

export type EntitySheetSize = 'details' | 'create';

export type EntitySheetProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size: EntitySheetSize;
  children: ReactNode;
}>;

export function EntitySheet({
  open,
  onOpenChange,
  size,
  children,
}: EntitySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'border-border bg-background flex w-full flex-col gap-0 overflow-hidden rounded-none border-l p-0 shadow-2xl',
          size === 'details' ? 'sm:max-w-[480px]' : 'sm:max-w-[520px]',
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export type EntitySheetHeaderProps = Readonly<{
  icon: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>;

export function EntitySheetHeader({
  icon,
  iconClassName,
  title,
  description,
  meta,
  actions,
  className,
}: EntitySheetHeaderProps) {
  return (
    <div
      className={cn(
        'bg-muted/5 border-border/50 relative shrink-0 overflow-hidden border-b',
        className,
      )}
    >
      <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center gap-6 px-8 py-5">
        <div
          className={cn(
            'border-border bg-background hover:border-primary/50 flex h-16 w-16 shrink-0 items-center justify-center rounded-none border shadow-sm transition-all',
            iconClassName,
          )}
        >
          {icon}
        </div>
        <div className="flex h-16 min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="truncate text-xl leading-none font-bold tracking-tight uppercase">
                {title}
              </h2>
              {meta ? <div className="shrink-0">{meta}</div> : null}
            </div>
            {description ? (
              <p className="text-muted-foreground hidden truncate text-[10px] font-bold tracking-tight uppercase opacity-40 sm:block">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="mt-2 flex items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type EntitySheetBodyProps = Readonly<{
  children: ReactNode;
}>;

export function EntitySheetBody({ children }: EntitySheetBodyProps) {
  return (
    <div className="custom-scrollbar bg-background/50 flex-1 overflow-y-auto">
      {children}
    </div>
  );
}

export type EntitySheetFooterProps = Readonly<{
  children: ReactNode;
}>;

export function EntitySheetFooter({ children }: EntitySheetFooterProps) {
  return (
    <div className="border-border bg-muted/10 relative z-10 shrink-0 border-t px-8 py-5">
      {children}
    </div>
  );
}
