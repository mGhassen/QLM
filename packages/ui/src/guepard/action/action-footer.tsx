import { useState } from 'react';

import { Button } from '@guepard/ui/button';
import { cn } from '@guepard/ui/utils';
import {
  ConfirmActionDialog,
  ConfirmNameDialog,
} from '@guepard/ui/dialog-primitives';

import type { Action } from './types';

export type ActionFooterProps<T> = Readonly<{
  actions: Action<T>[];
  ctx: T;
}>;

export function ActionFooter<T>({ actions, ctx }: ActionFooterProps<T>) {
  const [pending, setPending] = useState<Action<T> | null>(null);
  const [confirming, setConfirming] = useState(false);

  const visible = actions.filter((a) => a.isVisible?.(ctx) ?? true);
  const destructive = visible.filter(
    (a) => (a.intent ?? 'secondary') === 'destructive',
  );
  const primary = visible.filter(
    (a) => (a.intent ?? 'secondary') === 'primary',
  );
  const secondary = visible.filter((a) => {
    const i = a.intent ?? 'secondary';
    return i !== 'destructive' && i !== 'primary';
  });

  const run = async (action: Action<T>) => {
    if (action.confirm) {
      setPending(action);
      return;
    }
    await action.run(ctx);
  };

  const executePending = async () => {
    const action = pending;
    if (!action) return;
    setConfirming(true);
    try {
      await action.run(ctx);
      setPending(null);
    } finally {
      setConfirming(false);
    }
  };

  const pendingRequireTyped = pending?.confirm?.requireTyped;

  return (
    <>
      <div className="flex gap-2.5">
        {destructive.map((a) => (
          <Button
            key={a.id}
            variant="destructive"
            className="hover:bg-muted h-10 flex-1 cursor-pointer rounded-none border text-xs font-bold tracking-tight transition-all"
            disabled={a.isDisabled?.(ctx) ?? false}
            onClick={() => void run(a)}
          >
            {a.icon ? <a.icon className="mr-2 h-4 w-4" /> : null}
            {a.label}
          </Button>
        ))}

        {secondary.map((a) => (
          <Button
            key={a.id}
            variant="outline"
            className={cn(
              'h-10 flex-1 cursor-pointer rounded-none border text-xs font-bold tracking-tight transition-all',
              'hover:bg-muted transition-all',
            )}
            disabled={a.isDisabled?.(ctx) ?? false}
            onClick={() => void run(a)}
          >
            {a.icon ? <a.icon className="mr-2 h-3 w-3" /> : null}
            {a.label}
          </Button>
        ))}

        {primary.map((a) => (
          <Button
            key={a.id}
            className="bg-primary text-primary-foreground h-10 flex-1 cursor-pointer rounded-none text-xs font-bold tracking-tight transition-all hover:opacity-90"
            disabled={a.isDisabled?.(ctx) ?? false}
            onClick={() => void run(a)}
          >
            {a.icon ? <a.icon className="mr-2 h-4 w-4" /> : null}
            {a.label}
          </Button>
        ))}
      </div>

      {pendingRequireTyped ? (
        <ConfirmNameDialog
          open={!!pending}
          onOpenChange={(open) => !open && !confirming && setPending(null)}
          title={pending!.confirm!.title}
          description={
            typeof pending!.confirm!.description === 'function'
              ? pending!.confirm!.description(ctx)
              : pending!.confirm!.description
          }
          nameToConfirm={pendingRequireTyped.value(ctx)}
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
                ? pending.confirm.description(ctx)
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
