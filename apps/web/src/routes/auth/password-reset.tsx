import { createFileRoute } from '@tanstack/react-router';

import { PasswordResetRequestContainer } from '@guepard/auth/password-reset';
import { Heading } from '@guepard/ui/heading';
import { Trans } from '@guepard/ui/trans';

import pathsConfig from '@/config/paths.config';

export const Route = createFileRoute('/auth/password-reset')({
  head: () => ({ meta: [{ title: 'Reset Password — Rasm' }] }),
  component: PasswordResetPage,
});

function PasswordResetPage() {
  return (
    <div className="flex w-full flex-col items-center space-y-5">
      <div className="flex justify-center">
        <Heading level={4} className="tracking-tight">
          <Trans i18nKey="auth:passwordResetLabel" />
        </Heading>
      </div>

      <div className="w-full">
        <PasswordResetRequestContainer
          redirectPath={pathsConfig.auth.updatePassword}
        />
      </div>
    </div>
  );
}
