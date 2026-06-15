import { type ReactNode, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@guepard/ui/dropdown-menu';
import { Button } from '@guepard/ui/button';
import {
  ConfirmActionDialog,
  ConfirmNameDialog,
} from '@guepard/ui/dialog-primitives';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@guepard/ui/utils';

import type { Action } from './types';

export type RowActionMenuProps<T> = Readonly<{
  actions: Action<T>[];
  row: T;
  ariaLabel: string;
  /** When provided, replaces the default MoreHorizontal ghost button trigger. */
  trigger?: ReactNode;
}>;

export function RowActionMenu<T>({
  actions,
  row,
  ariaLabel,
  trigger,
}: RowActionMenuProps<T>) {
  const [pending, setPending] = useState<Action<T> | null>(null);
  const [confirming, setConfirming] = useState(false);

  const visible = actions.filter((a) => a.isVisible?.(row) ?? true);
  const primary = visible.filter(
    (a) => (a.intent ?? 'secondary') !== 'destructive',
  );
  const destructive = visible.filter(
    (a) => (a.intent ?? 'secondary') === 'destructive',
  );

  const run = async (action: Action<T>) => {
    if (action.confirm) {
      setPending(action);
      return;
    }
    await action.run(row);
  };

  const executePending = async () => {
    const action = pending;
    if (!action) return;
    setConfirming(true);
    try {
      await action.run(row);
      setPending(null);
    } finally {
      setConfirming(false);
    }
  };

  const pendingRequireTyped = pending?.confirm?.requireTyped;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              aria-label={ariaLabel}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-border bg-background w-52 rounded-none border p-0"
        >
          {primary.map((a) => (
            <DropdownMenuItem
              key={a.id}
              disabled={a.isDisabled?.(row) ?? false}
              className="hover:bg-muted cursor-pointer gap-3 rounded-none px-4 py-2 text-[11px] font-bold tracking-tight transition-colors"
              onClick={() => void run(a)}
            >
              {a.icon ? <a.icon className="h-4 w-4 opacity-70" /> : null}
              {a.label}
            </DropdownMenuItem>
          ))}
          {destructive.length ? (
            <DropdownMenuSeparator className="my-0" />
          ) : null}
          {destructive.map((a) => (
            <DropdownMenuItem
              key={a.id}
              disabled={a.isDisabled?.(row) ?? false}
              className={cn(
                'cursor-pointer gap-3 rounded-none px-4 py-2 text-[11px] font-bold tracking-tight transition-colors',
                'text-destructive hover:bg-destructive/10 hover:text-destructive',
              )}
              onClick={() => void run(a)}
            >
              {a.icon ? <a.icon className="h-4 w-4" /> : null}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {pendingRequireTyped ? (
        <ConfirmNameDialog
          open={!!pending}
          onOpenChange={(open) => !open && !confirming && setPending(null)}
          title={pending!.confirm!.title}
          description={
            typeof pending!.confirm!.description === 'function'
              ? pending!.confirm!.description(row)
              : pending!.confirm!.description
          }
          nameToConfirm={pendingRequireTyped.value(row)}
          namePrompt={pendingRequireTyped.prompt}
          cancelLabel={pending!.confirm!.cancelLabel}
          confirmLabel={pending!.confirm!.confirmLabel}
          confirming={confirming}
          onConfirm={executePending}
        />
      ) : (
        <ConfirmActionDialog
          open={!!pending && !pendingRequireTyped}
          onOpenChange={(open) => !open && !confirming && setPending(null)}
          title={pending?.confirm?.title ?? ''}
          description={
            pending?.confirm
              ? typeof pending.confirm.description === 'function'
                ? pending.confirm.description(row)
                : pending.confirm.description
              : ''
          }
          confirmLabel={pending?.confirm?.confirmLabel ?? ''}
          cancelLabel={pending?.confirm?.cancelLabel ?? ''}
          destructive={(pending?.intent ?? 'secondary') === 'destructive'}
          confirming={confirming}
          onConfirm={executePending}
        />
      )}
    </>
  );
}
