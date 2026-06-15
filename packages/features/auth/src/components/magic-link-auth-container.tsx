'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAppEvents } from '@qlm/shared/events';
import { useSignInWithOtp } from '@qlm/supabase/hooks/use-sign-in-with-otp';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@qlm/ui/form';
import { If } from '@qlm/ui/if';
import { Trans } from '@qlm/ui/trans';

import { useCaptcha } from '../captcha/client';
import { EmailInput } from './email-input';
import { TermsAndConditionsFormField } from './terms-and-conditions-form-field';

export function MagicLinkAuthContainer({
  displayTermsCheckbox,
  redirectUrl,
  shouldCreateUser,
  captchaSiteKey,
}: {
  displayTermsCheckbox?: boolean;
  shouldCreateUser: boolean;
  redirectUrl: string;
  captchaSiteKey?: string;
}) {
  const captcha = useCaptcha({ siteKey: captchaSiteKey });
  const captchaLoading = !captcha.isReady;
  const { t } = useTranslation();
  const signInWithOtpMutation = useSignInWithOtp();
  const appEvents = useAppEvents();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().email(),
      }),
    ),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = ({ email }: { email: string }) => {
    const url = new URL(redirectUrl);

    const emailRedirectTo = url.href;

    const promise = async () => {
      await signInWithOtpMutation.mutateAsync({
        email,
        options: {
          emailRedirectTo,
          captchaToken: captcha.token,
          shouldCreateUser,
        },
      });

      if (shouldCreateUser) {
        appEvents.emit({
          type: 'user.signedUp',
          payload: {
            method: 'magiclink',
          },
        });
      }
    };

    toast.promise(promise, {
      loading: t('auth:sendingEmailLink'),
      success: t(`auth:sendLinkSuccessToast`),
      error: t(`auth:errors.link`),
    });

    captcha.reset();
  };

  if (signInWithOtpMutation.data) {
    return <SuccessAlert />;
  }

  return (
    <Form {...form}>
      <form className={'w-full'} onSubmit={form.handleSubmit(onSubmit)}>
        <If condition={signInWithOtpMutation.error}>
          <ErrorAlert />
        </If>

        <div className={'flex flex-col space-y-4'}>
          <FormField
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <EmailInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
            name={'email'}
          />

          <If condition={displayTermsCheckbox}>
            <TermsAndConditionsFormField />
          </If>

          <Button disabled={signInWithOtpMutation.isPending || captchaLoading}>
            <If condition={captchaLoading}>
              <Trans i18nKey={'auth:verifyingCaptcha'} />
            </If>

            <If condition={signInWithOtpMutation.isPending && !captchaLoading}>
              <Trans i18nKey={'auth:sendingEmailLink'} />
            </If>

            <If condition={!signInWithOtpMutation.isPending && !captchaLoading}>
              <Trans i18nKey={'auth:sendEmailLink'} />
            </If>
          </Button>
        </div>
      </form>

      {captcha.field}
    </Form>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:sendLinkSuccess'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:sendLinkSuccessDescription'} />
      </AlertDescription>
    </Alert>
  );
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <ExclamationTriangleIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:errors.generic'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:errors.link'} />
      </AlertDescription>
    </Alert>
  );
}
