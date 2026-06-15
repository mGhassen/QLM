import { createFileRoute, Link } from '@tanstack/react-router';

import { SignUpMethodsContainer } from '@qlm/auth/sign-up';
import { Button } from '@qlm/ui/button';
import { Heading } from '@qlm/ui/heading';
import { Trans } from '@qlm/ui/trans';

import authConfig from '@/config/auth.config';
import pathsConfig from '@/config/paths.config';

export const Route = createFileRoute('/auth/sign-up')({
  head: () => ({ meta: [{ title: 'Sign Up — QLM' }] }),
  component: SignUpPage,
});

const paths = {
  callback: pathsConfig.auth.callback,
  appHome: pathsConfig.app.home,
};

function SignUpPage() {
  return (
    <div className="flex w-full flex-col items-center space-y-5">
      <div className="flex justify-center">
        <Heading level={4} className="tracking-tight">
          <Trans i18nKey="auth:signUpHeading" />
        </Heading>
      </div>

      <div className="w-full">
        <SignUpMethodsContainer
          paths={paths}
          providers={authConfig.providers}
          displayTermsCheckbox={authConfig.displayTermsCheckbox}
          captchaSiteKey={authConfig.captchaTokenSiteKey}
        />
      </div>

      <div className="flex justify-center">
        <Button asChild variant="link" size="sm">
          <Link to={pathsConfig.auth.signIn}>
            <Trans i18nKey="auth:alreadyHaveAnAccount" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
