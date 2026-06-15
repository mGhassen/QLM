import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@qlm/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@qlm/ui/card';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';

export type NameCardProps = Readonly<{
  name: string;
  isSubmitting?: boolean;
  onSubmit: (name: string) => void | Promise<void>;
}>;

type NameFormValues = { name: string };

export function NameCard({
  name,
  isSubmitting = false,
  onSubmit,
}: NameCardProps) {
  const { t } = useTranslation('user-profile');

  const form = useForm<NameFormValues>({
    defaultValues: { name },
    mode: 'onSubmit',
  });

  // Keep the form in sync when the upstream query resolves after mount or
  // after an external invalidation (topbar update, another tab, etc.).
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({ name });
    }
  }, [name, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const trimmed = values.name.trim();
    if (trimmed.length === 0) {
      form.setError('name', {
        type: 'required',
        message: t('name.required'),
      });
      return;
    }
    await onSubmit(trimmed);
    form.reset({ name: trimmed });
  });

  const errorMessage = form.formState.errors.name?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('name.title')}</CardTitle>
        <CardDescription>{t('name.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          data-test="name-card"
        >
          <div className="space-y-2">
            <Label htmlFor="user-profile-name">{t('name.label')}</Label>
            <Input
              id="user-profile-name"
              data-test="name-input"
              aria-invalid={errorMessage ? 'true' : 'false'}
              disabled={isSubmitting}
              {...form.register('name')}
            />
            {errorMessage ? (
              <p
                role="alert"
                data-test="name-error"
                className="text-destructive text-xs"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting} data-test="name-submit">
            {t('name.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
