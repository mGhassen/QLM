import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSupabase } from '@qlm/supabase/hooks/use-supabase';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@qlm/ui/form';
import { Input } from '@qlm/ui/input';
import { Trans } from '@qlm/ui/trans';

import { useCaptcha } from '../captcha/client';

export function ResendAuthLinkForm(props: { redirectPath?: string }) {
  const resendLink = useResendLink();
  const captcha = useCaptcha();

  const form = useForm({
    resolver: zodResolver(z.object({ email: z.string().email() })),
    defaultValues: {
      email: '',
    },
  });

  if (resendLink.data && !resendLink.isPending) {
    return (
      <Alert variant={'success'}>
        <AlertTitle>
          <Trans i18nKey={'auth:resendLinkSuccess'} />
        </AlertTitle>

        <AlertDescription>
          <Trans
            i18nKey={'auth:resendLinkSuccessDescription'}
            defaults={'Success!'}
          />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-2'}
        onSubmit={form.handleSubmit((data) => {
          return resendLink.mutate({
            email: data.email,
            redirectPath: props.redirectPath,
            captchaToken: captcha.token,
          });
        })}
      >
        <FormField
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'common:emailAddress'} />
                </FormLabel>

                <FormControl>
                  <Input type="email" required {...field} />
                </FormControl>
              </FormItem>
            );
          }}
          name={'email'}
        />

        <Button disabled={resendLink.isPending}>
          <Trans i18nKey={'auth:resendLink'} defaults={'Resend Link'} />
        </Button>
      </form>

      {captcha.field}
    </Form>
  );
}

function useResendLink() {
  const supabase = useSupabase();

  const mutationFn = async (props: {
    email: string;
    redirectPath?: string;
    captchaToken?: string;
  }) => {
    const response = await supabase.auth.resend({
      email: props.email,
      type: 'signup',
      options: {
        emailRedirectTo: props.redirectPath,
        captchaToken: props.captchaToken,
      },
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  };

  return useMutation({
    mutationFn,
  });
}
