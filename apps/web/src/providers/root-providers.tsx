import { preloadedI18nResources } from '@/lib/i18n/i18n.preloaded-resources';
import { i18nResolver } from '@/lib/i18n/i18n.resolver';
import { getI18nSettings } from '@/lib/i18n/i18n.settings';
import pathsConfig from '@/config/paths.config';
import { I18nProvider } from '@qlm/i18n/provider';
import { Toaster } from '@qlm/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';

/** Lazy-only so prod bundles never pull `@tanstack/react-router-devtools` (it fetches `/config.js`). */
const RouterDevtoolsLazy = lazy(async () => {
  if (!import.meta.env.DEV) {
    return { default: () => null };
  }
  const { TanStackRouterDevtools } =
    await import('@tanstack/react-router-devtools');
  return { default: TanStackRouterDevtools };
});
import { ReactQueryProvider } from './react-query-provider';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useUser } from '@qlm/supabase/hooks/use-user';
import { AuthProvider } from './auth-provider';
import { WorkspaceProvider } from './workspace-provider';
import { AppEventsProvider } from '@qlm/shared/events';
import { TelemetryProvider } from '@qlm/telemetry';
import { Loader2 } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const PUBLIC_ROUTES = new Set<string>([
  pathsConfig.auth.signIn,
  pathsConfig.auth.signUp,
  pathsConfig.auth.passwordReset,
  pathsConfig.auth.verify,
  pathsConfig.auth.callbackError,
  pathsConfig.auth.updatePassword,
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  if (pathname.startsWith('/auth/')) {
    return true;
  }

  if (pathname.startsWith('/join')) {
    return true;
  }

  if (/^\/docs\/[^/]+\/?$/.test(pathname)) {
    return true;
  }

  return false;
}

function AuthLoadingShell() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}

function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function AuthGuard(props: React.PropsWithChildren) {
  const location = useLocation();
  const isPublic = isPublicRoute(location.pathname);

  if (isPublic) {
    return <>{props.children}</>;
  }

  return <AuthenticatedProviders>{props.children}</AuthenticatedProviders>;
}

function AuthenticatedProviders(props: React.PropsWithChildren) {
  const mounted = useClientMounted();
  const user = useUser();
  const location = useLocation();

  if (!mounted || shouldWaitForUser(user)) {
    return <AuthLoadingShell />;
  }

  if (!user.data) {
    return (
      <Navigate
        to={pathsConfig.auth.signIn}
        search={{
          next: `${location.pathname}${location.searchStr}`,
        }}
      />
    );
  }

  return <WorkspaceProvider>{props.children}</WorkspaceProvider>;
}

function shouldWaitForUser(user: ReturnType<typeof useUser>): boolean {
  if (user.isPending) {
    return true;
  }

  // Cached `null` + in-flight refetch after sign-in (or tab refresh).
  if (!user.data && user.isFetching) {
    return true;
  }

  return false;
}

export function RootProviders(
  props: React.PropsWithChildren<{
    theme?: Theme;
    language?: string;
    queryClient: QueryClient;
  }>,
) {
  const settings = useMemo(
    () => getI18nSettings(props.language),
    [props.language],
  );

  return (
    <Suspense
      fallback={
        <AuthLoadingShell />
      }
    >
      <I18nProvider
        settings={settings}
        resolver={i18nResolver}
        preloadedResources={preloadedI18nResources}
      >
        <TelemetryProvider>
          <ReactQueryProvider queryClient={props.queryClient}>
            <AppEventsProvider>
              <AuthProvider>
                <ThemeProvider
                  attribute="class"
                  enableSystem
                  disableTransitionOnChange
                  defaultTheme={props.theme}
                  enableColorScheme={false}
                >
                  <AuthGuard>{props.children}</AuthGuard>
                  <Toaster richColors position="top-right" />
                  <Suspense fallback={null}>
                    <RouterDevtoolsLazy />
                  </Suspense>
                </ThemeProvider>
              </AuthProvider>
            </AppEventsProvider>
          </ReactQueryProvider>
        </TelemetryProvider>
      </I18nProvider>
    </Suspense>
  );
}
