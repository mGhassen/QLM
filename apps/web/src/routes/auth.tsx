import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AuthLayoutShell } from '@guepard/auth/shared';

import { AppLogo } from '@/components/app-logo';

export const Route = createFileRoute('/auth')({
  component: AuthLayoutComponent,
});

function AuthLayoutComponent() {
  return (
    <AuthLayoutShell Logo={AppLogo}>
      <Outlet />
    </AuthLayoutShell>
  );
}
