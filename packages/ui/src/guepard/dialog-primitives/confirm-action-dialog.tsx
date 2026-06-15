import { Loader2 } from 'lucide-react';

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

export type ConfirmActionDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  confirming?: boolean;
  onConfirm: () => void | Promise<void>;
}>;

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  destructive = false,
  confirming = false,
  onConfirm,
}: ConfirmActionDialogProps) {
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
        <AlertDialogFooter className="mt-8 gap-3 sm:justify-end sm:gap-3">
          <AlertDialogCancel className="border-border bg-background hover:bg-muted m-0 h-10 rounded-none border text-[11px] font-bold tracking-tight shadow-none transition-all">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={confirming}
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
