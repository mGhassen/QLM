'use client';

import type { Provider } from '@supabase/supabase-js';

import { isBrowser } from '@guepard/shared/utils';
import { If } from '@guepard/ui/if';
import { Separator } from '@guepard/ui/separator';
import { Trans } from '@guepard/ui/trans';

import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { EmailPasswordSignUpContainer } from './password-sign-up-container';

export function SignUpMethodsContainer(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  providers: {
    password: boolean;
    magicLink: boolean;
    oAuth: Provider[];
  };

  displayTermsCheckbox?: boolean;
  captchaSiteKey?: string;
}) {
  const redirectUrl = getCallbackUrl(props);

  return (
    <div className="flex flex-col gap-6">
      <If condition={props.providers.password}>
        <EmailPasswordSignUpContainer
          displayTermsCheckbox={props.displayTermsCheckbox}
          emailRedirectTo={redirectUrl}
          captchaSiteKey={props.captchaSiteKey}
        />
      </If>

      <If condition={props.providers.magicLink}>
        <MagicLinkAuthContainer
          shouldCreateUser={true}
          redirectUrl={redirectUrl}
          displayTermsCheckbox={props.displayTermsCheckbox}
          captchaSiteKey={props.captchaSiteKey}
        />
      </If>

      <If condition={props.providers.oAuth.length}>
        <div className="flex flex-col gap-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>

            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">
                <Trans i18nKey="auth:orContinueWith" />
              </span>
            </div>
          </div>

          <OauthProviders
            enabledProviders={props.providers.oAuth}
            shouldCreateUser={true}
            paths={{
              callback: props.paths.callback,
              returnPath: props.paths.appHome,
            }}
          />
        </div>
      </If>
    </div>
  );
}

function getCallbackUrl(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  inviteToken?: string;
}) {
  if (!isBrowser()) {
    return '';
  }

  const redirectPath = props.paths.callback;
  const origin = window.location.origin;
  const url = new URL(redirectPath, origin);

  if (props.inviteToken) {
    url.searchParams.set('invite_token', props.inviteToken);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const next = searchParams.get('next');

  if (next) {
    url.searchParams.set('next', next);
  }

  return url.href;
}
