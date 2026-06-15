import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';

import { SignInMethodsContainer } from '@qlm/auth/sign-in';
import { Button } from '@qlm/ui/button';
import { Heading } from '@qlm/ui/heading';
import { Trans } from '@qlm/ui/trans';

import authConfig from '@/config/auth.config';
import pathsConfig from '@/config/paths.config';

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Sign In — QLM' }] }),
  component: SignInPage,
});

function SignInPage() {
  const { next } = Route.useSearch();
  const returnPath = next ?? pathsConfig.app.home;

  const paths = {
    callback: pathsConfig.auth.callback,
    joinOrganization: pathsConfig.app.joinOrganization,
    returnPath,
  };

  return (
    <div className="flex w-full flex-col items-center space-y-5">
      <div className="flex justify-center">
        <Heading level={4} className="tracking-tight">
          <Trans i18nKey="auth:signInHeading" />
        </Heading>
      </div>

      <div className="w-full">
        <SignInMethodsContainer
          paths={paths}
          providers={authConfig.providers}
          captchaSiteKey={authConfig.captchaTokenSiteKey}
        />
      </div>

      <div className="flex justify-center">
        <Button asChild variant="link" size="sm">
          <Link to={pathsConfig.auth.signUp}>
            <Trans i18nKey="auth:doNotHaveAccountYet" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
