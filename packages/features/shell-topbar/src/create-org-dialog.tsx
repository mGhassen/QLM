import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import { Input } from '@guepard/ui/input';
import { Label } from '@guepard/ui/label';

const FormSchema = z.object({
  name: z.string().min(1),
});

export type CreateOrgFormInput = z.infer<typeof FormSchema>;

export interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (input: CreateOrgFormInput) => Promise<void>;
  serverError?: string;
  defaultValues?: Partial<CreateOrgFormInput>;
}

/**
 * Modal form for creating an organization. Name is the only user-facing
 * field — slug is generated server-side. The DB trigger seeds a default
 * project on org insert, so the parent can navigate to that project
 * right after `onSubmit` resolves.
 */
export function CreateOrgDialog(props: Readonly<CreateOrgDialogProps>) {
  const { open, onOpenChange, onSubmit, serverError, defaultValues } = props;
  const { t } = useTranslation('shell');

  const form = useForm<CreateOrgFormInput>({
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
          <DialogTitle>{t('dialog.newOrganization.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-org-name">
              {t('dialog.newOrganization.nameLabel')}
            </Label>
            <Input
              id="create-org-name"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">
                {t('dialog.newOrganization.error.nameRequired')}
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
              {t('dialog.newOrganization.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || isInvalid}>
              {isSubmitting ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null}
              {t('dialog.newOrganization.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
