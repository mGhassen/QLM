'use client';

import { Link } from '@tanstack/react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@guepard/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@guepard/ui/form';
import { If } from '@guepard/ui/if';
import { Trans } from '@guepard/ui/trans';

import { PasswordSignInSchema } from '../schemas/password-sign-in.schema';
import { EmailInput } from './email-input';
import { PasswordInput } from './password-input';

export const PasswordSignInForm: React.FC<{
  onSubmit: (params: z.infer<typeof PasswordSignInSchema>) => unknown;
  loading: boolean;
  redirecting: boolean;
}> = ({ onSubmit, loading = false, redirecting = false }) => {
  const form = useForm<z.infer<typeof PasswordSignInSchema>>({
    resolver: zodResolver(PasswordSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form
        className={'w-full space-y-2.5'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name={'email'}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <EmailInput {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'password'}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <PasswordInput {...field} />
              </FormControl>

              <FormMessage />

              <div>
                <Button
                  asChild
                  type={'button'}
                  size={'sm'}
                  variant={'link'}
                  className={'text-xs'}
                >
                  <Link to={'/auth/password-reset'}>
                    <Trans i18nKey={'auth:passwordForgottenQuestion'} />
                  </Link>
                </Button>
              </div>
            </FormItem>
          )}
        />

        <Button
          data-test="auth-submit-button"
          className={'group w-full'}
          type="submit"
          disabled={loading || redirecting}
        >
          <If condition={redirecting}>
            <span className={'animate-in fade-in slide-in-from-bottom-24'}>
              <Trans i18nKey={'auth:redirecting'} />
            </span>
          </If>

          <If condition={loading}>
            <span className={'animate-in fade-in slide-in-from-bottom-24'}>
              <Trans i18nKey={'auth:signingIn'} />
            </span>
          </If>

          <If condition={!redirecting && !loading}>
            <span className={'animate-out fade-out flex items-center'}>
              <Trans i18nKey={'auth:signInWithEmail'} />

              <ArrowRight
                className={
                  'zoom-in animate-in slide-in-from-left-2 fill-mode-both h-4 delay-500 duration-500'
                }
              />
            </span>
          </If>
        </Button>
      </form>
    </Form>
  );
};
