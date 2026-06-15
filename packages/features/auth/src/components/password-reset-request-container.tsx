'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import i18next from 'i18next';
import { z } from 'zod';

import { useRequestResetPassword } from '@guepard/supabase/hooks/use-request-reset-password';
import { Alert, AlertDescription } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@guepard/ui/form';
import { If } from '@guepard/ui/if';
import { Input } from '@guepard/ui/input';
import { Trans } from '@guepard/ui/trans';

import { useCaptcha } from '../captcha/client';
import { AuthErrorAlert } from './auth-error-alert';

const PasswordResetSchema = z.object({
  email: z.string().email(),
});

export function PasswordResetRequestContainer(params: {
  redirectPath: string;
}) {
  const resetPasswordMutation = useRequestResetPassword();
  const captcha = useCaptcha();

  const error = resetPasswordMutation.error;
  const success = resetPasswordMutation.data;

  const form = useForm<z.infer<typeof PasswordResetSchema>>({
    resolver: zodResolver(PasswordResetSchema),
    defaultValues: {
      email: '',
    },
  });

  return (
    <>
      <If condition={success}>
        <Alert variant={'success'}>
          <AlertDescription data-test="password-reset-success-alert">
            <Trans i18nKey={'auth:passwordResetSuccessMessage'} />
          </AlertDescription>
        </Alert>
      </If>

      <If condition={!resetPasswordMutation.data}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(({ email }) => {
              const redirectTo = new URL(
                params.redirectPath,
                window.location.origin,
              ).href;

              return resetPasswordMutation
                .mutateAsync({
                  email,
                  redirectTo,
                  captchaToken: captcha.token,
                })
                .catch(() => {
                  captcha.reset();
                });
            })}
            className={'w-full'}
          >
            <div className={'flex flex-col space-y-4'}>
              <div>
                <p className={'text-muted-foreground text-sm'}>
                  <Trans i18nKey={'auth:passwordResetSubheading'} />
                </p>
              </div>

              <AuthErrorAlert error={error} />

              <FormField
                name={'email'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'common:emailAddress'} />
                    </FormLabel>

                    <FormControl>
                      <Input
                        data-test="email-input"
                        required
                        type="email"
                        placeholder={
                          i18next.isInitialized
                            ? i18next.t('emailPlaceholder', {
                                ns: 'auth',
                                defaultValue: 'your@email.com',
                              })
                            : 'your@email.com'
                        }
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                data-test="auth-submit-button"
                disabled={resetPasswordMutation.isPending}
                type="submit"
              >
                <Trans i18nKey={'auth:passwordResetLabel'} />
              </Button>
            </div>
          </form>

          {captcha.field}
        </Form>
      </If>
    </>
  );
}
