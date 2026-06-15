import { createFileRoute } from '@tanstack/react-router';

import { AuthLayoutShell } from '@qlm/auth/shared';
import { UpdatePasswordForm } from '@qlm/auth/password-reset';
import { Heading } from '@qlm/ui/heading';
import { Trans } from '@qlm/ui/trans';

import { AppLogo } from '@/components/app-logo';
import pathsConfig from '@/config/paths.config';

export const Route = createFileRoute('/update-password')({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  return (
    <AuthLayoutShell Logo={AppLogo}>
      <div className="flex w-full flex-col items-center space-y-5">
        <div className="flex justify-center">
          <Heading level={4} className="tracking-tight">
            <Trans i18nKey="auth:updatePassword" />
          </Heading>
        </div>

        <div className="w-full">
          <UpdatePasswordForm redirectTo={pathsConfig.app.home} />
        </div>
      </div>
    </AuthLayoutShell>
  );
}
