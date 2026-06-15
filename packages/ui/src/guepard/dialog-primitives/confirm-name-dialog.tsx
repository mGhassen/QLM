import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Input } from '@guepard/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@guepard/ui/alert-dialog';
import { cn } from '@guepard/ui/utils';

export type ConfirmNameDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  nameToConfirm: string;
  namePrompt: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  confirming?: boolean;
  destructive?: boolean;
}>;

export function ConfirmNameDialog({
  open,
  onOpenChange,
  title,
  description,
  nameToConfirm,
  namePrompt,
  cancelLabel,
  confirmLabel,
  onConfirm,
  confirming = false,
  destructive = true, // Default to true as it's 'ConfirmDelete' node usually
}: ConfirmNameDialogProps) {
  const [value, setValue] = useState('');

  // Clear the input whenever the parent closes the dialog.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setValue('');
  }

  const disabled = value !== nameToConfirm || confirming;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-background max-w-md rounded-none border p-8 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-2 text-xl font-bold tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mb-4 text-sm leading-relaxed font-medium tracking-tight">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-6 mb-2">
          <label className="text-muted-foreground/60 mb-1 block text-[10px] font-bold tracking-tight uppercase">
            {namePrompt}
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={nameToConfirm}
            className="border-border bg-background focus:border-destructive h-10 rounded-none border px-3 text-sm font-bold tracking-tight shadow-none focus:ring-0"
            autoFocus
          />
        </div>
        <AlertDialogFooter className="mt-8 gap-3 sm:justify-end sm:gap-3">
          <AlertDialogCancel className="border-border bg-background hover:bg-muted m-0 h-10 rounded-none border text-[11px] font-bold tracking-tight shadow-none transition-all">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            className={cn(
              'border-border m-0 h-10 cursor-pointer rounded-none border text-[11px] font-bold tracking-tight transition-all disabled:opacity-50',
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive/20 shadow-none'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20 shadow-none',
            )}
            onClick={onConfirm}
          >
            {confirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
