import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@qlm/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@qlm/ui/dialog';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';

const FormSchema = z.object({
  name: z.string().min(1),
});

export type CreateProjectFormInput = z.infer<typeof FormSchema>;

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (input: CreateProjectFormInput) => Promise<void>;
  serverError?: string;
  defaultValues?: Partial<CreateProjectFormInput>;
}

/**
 * Modal form for creating a project. Name is the only user-facing field —
 * slug is generated server-side. The parent (ShellTopbar) owns the
 * mutation via `onSubmit` and toggles `open` + passes `serverError` back;
 * the dialog doesn't close itself on success.
 */
export function CreateProjectDialog(props: Readonly<CreateProjectDialogProps>) {
  const { open, onOpenChange, onSubmit, serverError, defaultValues } = props;
  const { t } = useTranslation('shell');

  const form = useForm<CreateProjectFormInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '', ...defaultValues },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ name: '', ...defaultValues });
    }
  }, [open, defaultValues, form]);

  const isSubmitting = form.formState.isSubmitting;
  const isInvalid = !form.formState.isValid;

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.newProject.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-project-name">
              {t('dialog.newProject.nameLabel')}
            </Label>
            <Input
              id="create-project-name"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">
                {t('dialog.newProject.error.nameRequired')}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <p role="alert" className="text-destructive text-sm">
              {serverError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('dialog.newProject.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || isInvalid}>
              {isSubmitting ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null}
              {t('dialog.newProject.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
