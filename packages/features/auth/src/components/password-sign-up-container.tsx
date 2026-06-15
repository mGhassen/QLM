'use client';

import { useCallback, useRef, useState } from 'react';

import { CheckCircledIcon } from '@radix-ui/react-icons';

import { useAppEvents } from '@guepard/shared/events';
import { useSignUpWithEmailAndPassword } from '@guepard/supabase/hooks/use-sign-up-with-email-password';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { If } from '@guepard/ui/if';
import { Trans } from '@guepard/ui/trans';

import { useCaptcha } from '../captcha/client';
import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignUpForm } from './password-sign-up-form';

interface EmailPasswordSignUpContainerProps {
  onSignUp?: (userId?: string) => unknown;
  displayTermsCheckbox?: boolean;
  emailRedirectTo: string;
  captchaSiteKey?: string;
}

export function EmailPasswordSignUpContainer({
  onSignUp,
  emailRedirectTo,
  displayTermsCheckbox,
  captchaSiteKey,
}: EmailPasswordSignUpContainerProps) {
  const captcha = useCaptcha({ siteKey: captchaSiteKey });

  const signUpMutation = useSignUpWithEmailAndPassword();
  const redirecting = useRef(false);
  const loading = signUpMutation.isPending || redirecting.current;
  const [showVerifyEmailAlert, setShowVerifyEmailAlert] = useState(false);
  const appEvents = useAppEvents();

  const onSignupRequested = useCallback(
    async (credentials: { email: string; password: string }) => {
      if (loading) {
        return;
      }

      try {
        const data = await signUpMutation.mutateAsync({
          ...credentials,
          emailRedirectTo,
          captchaToken: captcha.token,
        });

        appEvents.emit({
          type: 'user.signedUp',
          payload: {
            method: 'password',
          },
        });

        setShowVerifyEmailAlert(true);

        if (onSignUp) {
          onSignUp(data.user?.id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        captcha.reset();
      }
    },
    [captcha, emailRedirectTo, loading, onSignUp, signUpMutation, appEvents],
  );

  return (
    <>
      <If condition={showVerifyEmailAlert}>
        <SuccessAlert />
      </If>

      <If condition={!showVerifyEmailAlert}>
        <AuthErrorAlert error={signUpMutation.error} />

        <div>
          <PasswordSignUpForm
            displayTermsCheckbox={displayTermsCheckbox}
            onSubmit={onSignupRequested}
            loading={loading}
          />

          {captcha.field}
        </div>
      </If>
    </>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckCircledIcon className={'w-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:emailConfirmationAlertHeading'} />
      </AlertTitle>

      <AlertDescription data-test={'email-confirmation-alert'}>
        <Trans i18nKey={'auth:emailConfirmationAlertBody'} />
      </AlertDescription>
    </Alert>
  );
}
