import { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../shadcn/alert-dialog';
import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { cn } from '../../lib/utils';
import type { BulkAction } from './types';
import type { Action } from '@guepard/ui/action';

export type BulkActionBarProps<T> = {
  selected: T[];
  totalCount?: number;
  actions: Array<BulkAction<T> | Action<T>>;
  onClear: () => void;
  selectedLabel: (count: number) => string;
  selectionStateLabel: {
    all: string;
    selected: string;
  };
  overflowLabel: string;
  clearLabel: string;
};

export function BulkActionBar<T>({
  selected,
  totalCount,
  actions,
  onClear,
  selectedLabel: _selectedLabel,
  selectionStateLabel,
  overflowLabel,
  clearLabel,
}: Readonly<BulkActionBarProps<T>>) {
  const [pending, setPending] = useState<BulkAction<T> | null>(null);

  const isBulkAction = (a: BulkAction<T> | Action<T>): a is BulkAction<T> => {
    return 'overflow' in a || 'destructive' in a;
  };

  const normalized: BulkAction<T>[] = actions.map((a) => {
    if (isBulkAction(a)) return a;
    return {
      id: a.id,
      label: a.label,
      icon: a.icon,
      destructive: (a.intent ?? 'secondary') === 'destructive',
      overflow: false,
      confirm: a.confirm
        ? {
            title: a.confirm.title,
            description: (rows) =>
              typeof a.confirm!.description === 'function'
                ? a.confirm!.description(rows)
                : a.confirm!.description,
            confirmLabel: a.confirm.confirmLabel,
            cancelLabel: a.confirm.cancelLabel,
          }
        : undefined,
      isDisabled: a.isDisabled ? (rows) => a.isDisabled!(rows) : undefined,
      run: (rows) => a.run(rows),
    };
  });

  const inlineActions = normalized.filter((a) => !a.destructive && !a.overflow);
  const overflowActions = normalized.filter(
    (a) => !a.destructive && a.overflow,
  );
  const destructiveActions = normalized.filter((a) => a.destructive);

  const isAllSelected =
    totalCount !== undefined && selected.length >= totalCount && totalCount > 0;

  const run = async (action: BulkAction<T>) => {
    if (action.confirm) {
      setPending(action);
      return;
    }
    await action.run(selected);
  };

  return (
    <>
      <AnimatePresence>
        {selected.length > 0 && (
          <div className="pointer-events-none fixed right-0 bottom-12 left-0 z-50 flex justify-center px-4">
            <motion.div
              layout
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              role="toolbar"
              className={cn(
                'pointer-events-auto flex items-center gap-0.5',
                'border-border bg-background rounded-none border px-1.5 py-0.5',
              )}
            >
              {/* Selection Summary */}
              <div className="flex items-center gap-2 px-1">
                <div
                  className={cn(
                    'flex h-6 min-w-6 items-center justify-center rounded-none px-1.5 text-[10px] font-black tabular-nums transition-colors',
                    isAllSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-foreground text-background',
                  )}
                >
                  {selected.length}
                </div>
                <span className="text-foreground text-[12px] font-bold tracking-tight">
                  {isAllSelected
                    ? selectionStateLabel.all
                    : selectionStateLabel.selected}
                </span>
              </div>

              <div className="bg-border mx-1.5 h-8 w-px" />

              {/* Actions List */}
              <div className="flex items-center gap-1 px-1">
                {/* Regular Inline actions */}
                {inlineActions.map((action) => {
                  const disabled = action.isDisabled?.(selected) ?? false;
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="hover:bg-muted h-10 cursor-pointer gap-2.5 rounded-none px-4 text-[11px] font-bold tracking-tight transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => void run(action)}
                    >
                      {action.icon && (
                        <action.icon className="h-4 w-4 shrink-0 opacity-80" />
                      )}
                      <span>{action.label}</span>
                    </Button>
                  );
                })}

                {/* Destructive actions (integrated as requested) */}
                {destructiveActions.map((action) => {
                  const disabled = action.isDisabled?.(selected) ?? false;
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="text-destructive hover:bg-destructive/10 h-10 cursor-pointer gap-2.5 rounded-none px-4 text-[11px] font-bold tracking-tight transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => void run(action)}
                    >
                      {action.icon && (
                        <action.icon className="h-4 w-4 shrink-0" />
                      )}
                      <span>{action.label}</span>
                    </Button>
                  );
                })}

                {/* Overflow dropdown (Last icon in the list) */}
                {overflowActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-muted h-11 w-10 shrink-0 cursor-pointer rounded-none p-0"
                        aria-label={overflowLabel}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      side="top"
                      sideOffset={16}
                      className="border-border bg-background w-56 rounded-none border p-0"
                    >
                      {overflowActions.map((action) => (
                        <DropdownMenuItem
                          key={action.id}
                          className="hover:bg-muted cursor-pointer gap-3 rounded-none px-3 py-2 text-[11px] font-bold tracking-tight transition-colors"
                          onClick={() => void run(action)}
                        >
                          {action.icon && (
                            <action.icon className="h-4 w-4 opacity-70" />
                          )}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="bg-border mx-2 h-10 w-px" />

              {/* Minimal Dismiss Action */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive group h-11 w-11 cursor-pointer rounded-none transition-colors"
                onClick={onClear}
                aria-label={clearLabel}
              >
                <X className="h-5 w-5 transition-transform group-hover:scale-110" />
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent className="border-border bg-background max-w-md rounded-none border p-8 shadow-xl">
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="mb-2 text-xl font-bold tracking-tight">
                  {pending.confirm?.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground mb-4 text-sm leading-relaxed font-medium tracking-tight">
                  {typeof pending.confirm?.description === 'function'
                    ? pending.confirm.description(selected)
                    : pending.confirm?.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3 sm:justify-end sm:gap-3">
                <AlertDialogCancel className="border-border bg-background hover:bg-muted m-0 h-10 rounded-none border text-[11px] font-bold tracking-tight shadow-none transition-all">
                  {pending.confirm?.cancelLabel}
                </AlertDialogCancel>
                <AlertDialogAction
                  className={cn(
                    'border-border industrial-button m-0 h-10 rounded-none border text-[11px] font-bold tracking-tight transition-all',
                    pending.destructive
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive hover:border-destructive/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary hover:border-primary/90',
                  )}
                  onClick={async () => {
                    const action = pending;
                    setPending(null);
                    await action.run(selected);
                  }}
                >
                  {pending.confirm?.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
