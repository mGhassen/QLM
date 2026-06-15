import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import { Trans } from '@guepard/ui/trans';

import pathsConfig from '@/config/paths.config';

const searchSchema = z.object({
  error: z.string().optional(),
  code: z.string().optional(),
});

export const Route = createFileRoute('/auth/callback-error')({
  validateSearch: searchSchema,
  component: CallbackErrorPage,
});

function CallbackErrorPage() {
  const { error, code } = Route.useSearch();

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Alert variant="destructive" className="w-full">
        <AlertTitle>
          <Trans i18nKey="auth:authenticationErrorAlertHeading" />
        </AlertTitle>
        <AlertDescription className="space-y-2">
          {error?.startsWith('auth:') ? (
            <Trans i18nKey={error} />
          ) : error ? (
            <span>{error}</span>
          ) : (
            <Trans i18nKey="auth:authenticationErrorAlertBody" />
          )}
          {code ? (
            <span className="text-muted-foreground block text-xs">{code}</span>
          ) : null}
        </AlertDescription>
      </Alert>

      <Button asChild>
        <Link to={pathsConfig.auth.signIn}>
          <Trans i18nKey="auth:signIn" />
        </Link>
      </Button>
    </div>
  );
}
