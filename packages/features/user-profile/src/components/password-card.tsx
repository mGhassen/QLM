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

const MIN_PASSWORD_LENGTH = 8;

export type PasswordCardProps = Readonly<{
  /**
   * Whether the user has an `email` identity that can sign in with a password.
   * Resolves from `useUserIdentities().isProviderConnected('email')` in the
   * caller. OAuth-only users (no email identity) see the not-linked banner
   * instead of the form.
   */
  isLinked?: boolean;
  isSubmitting?: boolean;
  /**
   * When set (e.g. after the adapter rejects with `InvalidCurrentPasswordException`),
   * the form surfaces it as an inline error on the `current` field.
   * Resets when the user types in `current`.
   */
  currentPasswordError?: string | null;
  onSubmit: (input: { current: string; next: string }) => void | Promise<void>;
}>;

type FormValues = {
  current: string;
  next: string;
  confirm: string;
};

export function PasswordCard({
  isLinked = true,
  isSubmitting = false,
  currentPasswordError = null,
  onSubmit,
}: PasswordCardProps) {
  const { t } = useTranslation('user-profile');

  const form = useForm<FormValues>({
    defaultValues: { current: '', next: '', confirm: '' },
    mode: 'onSubmit',
  });

  // Surface server-side current-password rejection on the form.
  useEffect(() => {
    if (currentPasswordError) {
      form.setError('current', {
        type: 'server',
        message: currentPasswordError,
      });
    }
  }, [currentPasswordError, form]);

  if (!isLinked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            data-test="password-not-linked-banner"
            className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {t('password.noIdentityLinked')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const { current, next, confirm } = values;
    if (!current || !next || !confirm) {
      form.setError('next', {
        type: 'required',
        message: t('password.required'),
      });
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      form.setError('next', {
        type: 'minLength',
        message: t('password.tooShort'),
      });
      return;
    }
    if (next === current) {
      form.setError('next', {
        type: 'distinct',
        message: t('password.sameAsCurrent'),
      });
      return;
    }
    if (next !== confirm) {
      form.setError('confirm', {
        type: 'mismatch',
        message: t('password.mismatch'),
      });
      return;
    }

    await onSubmit({ current, next });
    // Reset cleanly so the password values don't linger in the DOM.
    form.reset({ current: '', next: '', confirm: '' });
  });

  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('password.title')}</CardTitle>
        <CardDescription>{t('password.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          data-test="password-card"
        >
          <div className="space-y-2">
            <Label htmlFor="user-profile-password-current">
              {t('password.current')}
            </Label>
            <Input
              id="user-profile-password-current"
              data-test="password-current"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={errors.current ? 'true' : 'false'}
              {...form.register('current', {
                onChange: () => {
                  if (errors.current) form.clearErrors('current');
                },
              })}
            />
            {errors.current?.message ? (
              <p
                role="alert"
                data-test="password-current-error"
                className="text-destructive text-xs"
              >
                {errors.current.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-profile-password-next">
              {t('password.next')}
            </Label>
            <Input
              id="user-profile-password-next"
              data-test="password-next"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={errors.next ? 'true' : 'false'}
              {...form.register('next')}
            />
            {errors.next?.message ? (
              <p
                role="alert"
                data-test="password-next-error"
                className="text-destructive text-xs"
              >
                {errors.next.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-profile-password-confirm">
              {t('password.confirm')}
            </Label>
            <Input
              id="user-profile-password-confirm"
              data-test="password-confirm"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={errors.confirm ? 'true' : 'false'}
              {...form.register('confirm')}
            />
            {errors.confirm?.message ? (
              <p
                role="alert"
                data-test="password-confirm-error"
                className="text-destructive text-xs"
              >
                {errors.confirm.message}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-test="password-submit"
          >
            {t('password.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
