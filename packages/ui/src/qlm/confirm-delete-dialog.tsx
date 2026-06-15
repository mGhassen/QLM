'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../shadcn/alert-dialog';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  itemCount?: number;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationText?: string;
  confirmationPlaceholder?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName = 'item',
  itemCount = 1,
  isLoading = false,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmationText,
  confirmationPlaceholder,
}: ConfirmDeleteDialogProps) {
  const [confirmationInput, setConfirmationInput] = React.useState('');
  const isPlural = itemCount > 1;
  const defaultTitle =
    title || `Delete ${isPlural ? `${itemName}s` : itemName}?`;
  const defaultDescription = description || (
    <>
      {isPlural ? (
        <>
          Are you sure you want to delete {itemCount} {itemName}s? This action
          cannot be undone and will permanently remove these {itemName}s.
        </>
      ) : (
        <>
          Are you sure you want to delete this {itemName}? This action cannot be
          undone and will permanently remove the {itemName}.
        </>
      )}
    </>
  );

  const requiredText =
    confirmationText || `delete ${isPlural ? `${itemName}s` : itemName}`;
  const isConfirmationValid =
    confirmationInput.toLowerCase().trim() ===
    requiredText.toLowerCase().trim();

  React.useEffect(() => {
    if (!open) {
      setConfirmationInput('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!confirmationText || isConfirmationValid) {
      onConfirm();
      setConfirmationInput('');
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!isLoading) {
          onOpenChange(open);
        }
      }}
    >
      <AlertDialogContent className="border-border bg-background max-w-md rounded-none border p-8 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-2 text-xl font-bold tracking-tight">
            {defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mb-4 text-sm font-medium tracking-tight">
            {defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmationText && (
          <div className="space-y-2 py-2">
            <Label
              htmlFor="confirmation-input"
              className="text-muted-foreground/60 mb-1 block text-[10px] font-bold tracking-tight uppercase"
            >
              Type{' '}
              <span className="text-destructive font-mono">{requiredText}</span>{' '}
              to confirm:
            </Label>
            <Input
              id="confirmation-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={
                confirmationPlaceholder || `Type "${requiredText}" to confirm`
              }
              disabled={isLoading}
              className="border-border bg-background focus:border-destructive h-10 rounded-none border px-3 text-sm font-bold tracking-tight shadow-none focus:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmationValid && !isLoading) {
                  handleConfirm();
                }
              }}
            />
          </div>
        )}
        <AlertDialogFooter className="mt-8 gap-3 sm:justify-end sm:gap-3">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={() => setConfirmationInput('')}
            className="border-border bg-background hover:bg-muted m-0 h-10 rounded-none border text-[11px] font-bold tracking-tight shadow-none transition-all"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isLoading || (confirmationText ? !isConfirmationValid : false)
            }
            className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 rounded-none border text-[11px] font-bold tracking-tight shadow-none transition-all"
          >
            {isLoading ? 'Deleting...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
