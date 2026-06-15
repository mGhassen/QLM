import { useNavigate } from '@tanstack/react-router';

import type { Provider } from '@supabase/supabase-js';

import { isBrowser } from '@guepard/shared/utils';
import { If } from '@guepard/ui/if';
import { Separator } from '@guepard/ui/separator';
import { Trans } from '@guepard/ui/trans';

import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { PasswordSignInContainer } from './password-sign-in-container';

export function SignInMethodsContainer(props: {
  paths: {
    callback: string;
    returnPath: string;
    joinOrganization: string;
  };

  providers: {
    password: boolean;
    magicLink: boolean;
    oAuth: Provider[];
  };

  captchaSiteKey?: string;
}) {
  const navigate = useNavigate();

  const redirectUrl = isBrowser()
    ? new URL(props.paths.callback, window?.location.origin).toString()
    : '';

  const onSignIn = () => {
    return navigate({ to: props.paths.returnPath, replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <If condition={props.providers.password}>
        <PasswordSignInContainer
          onSignIn={onSignIn}
          captchaSiteKey={props.captchaSiteKey}
        />
      </If>

      <If condition={props.providers.magicLink}>
        <MagicLinkAuthContainer
          shouldCreateUser={false}
          redirectUrl={redirectUrl}
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
            shouldCreateUser={false}
            paths={{
              callback: props.paths.callback,
              returnPath: props.paths.returnPath,
            }}
          />
        </div>
      </If>
    </div>
  );
}
