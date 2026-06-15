import { Navigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  GetLastProjectService,
  GetOrganizationsService,
} from '@qlm/domain/services';
import { getLogger } from '@qlm/shared/logger';
import { useUser } from '@qlm/supabase/hooks/use-user';
import { Trans } from '@qlm/ui/trans';

import pathsConfig, { createProjectAppPath } from '@/config/paths.config';
import { useWorkspace } from '@/lib/context/workspace-context';
import { getAppRegistry } from '@/shell/app-registry';

/**
 * Landing redirect used by `/` and `/organizations/`.
 *
 * Platform invariant: every authenticated user belongs to at least one
 * organization, and every organization has at least one project. DB
 * triggers are the primary enforcement of those invariants. This
 * component is a safety net: if a trigger fails or legacy data is broken,
 * we render a neutral "something's off" panel (friendly for end users)
 * and log the violation for operators, rather than either spinning
 * forever or surfacing a stack trace.
 *
 * Guards first, workspace lookup second: `useWorkspace()` throws outside
 * the authed provider tree, so the unauth / loading branches run before
 * the workspace-dependent resolution is mounted. React requires hooks to
 * render in a stable order, so the authed-only work lives in a child
 * component (`AuthedLastProjectRedirect`).
 */
export function LastProjectRedirect() {
  const user = useUser();

  if (user.isLoading) {
    return <RedirectSpinner />;
  }

  const userId = user.data?.id;
  if (!userId) {
    // Keep this Navigate minimal. `AuthenticatedProviders` in
    // `root-providers.tsx` already redirects unauth users to sign-in
    // with `?next=<original-path>`; this branch is a belt-and-braces
    // fallback that only fires if this component somehow renders
    // without the outer guard. Adding `search={{ next: ... }}` here
    // triggers an infinite redirect loop in React 19 + TanStack
    // Router: the component re-renders after `Navigate` with
    // `useLocation` pointing at the freshly-pushed `/auth/sign-in`
    // URL, nesting the `next` param recursively.
    return <Navigate to={pathsConfig.auth.signIn} replace />;
  }

  return <AuthedLastProjectRedirect userId={userId} />;
}

type ResolutionError =
  | { kind: 'no-org' }
  | { kind: 'no-projects'; organizationId: string };

function AuthedLastProjectRedirect({ userId }: Readonly<{ userId: string }>) {
  const { repositories } = useWorkspace();

  const {
    data: resolved,
    isLoading,
    error: resolveError,
  } = useQuery<{ slug: string } | ResolutionError>({
    queryKey: ['last-project-redirect', userId],
    retry: false,
    queryFn: async () => {
      const orgs = await new GetOrganizationsService(
        repositories.organization,
      ).execute();
      const activeOrg = orgs[0];
      if (!activeOrg) {
        const logger = await getLogger();
        logger.error(
          { userId },
          'Invariant violated: authed user has no organizations. Check DB triggers that seed a default org on auth.users insert.',
        );
        return { kind: 'no-org' } as const;
      }

      let lastProjectId: string | null = null;
      try {
        lastProjectId = await new GetLastProjectService(
          repositories.userPreferences,
        ).execute({ userId, organizationId: activeOrg.id });
      } catch {
        // Preferences are best-effort for landing — fall back to the org default.
      }

      if (lastProjectId) {
        const project = await repositories.project.findById(lastProjectId);
        if (project) return { slug: project.slug };
      }

      const projects = await repositories.project.findAllByOrganizationId(
        activeOrg.id,
      );
      const fallback = projects[0];
      if (!fallback) {
        const logger = await getLogger();
        logger.error(
          { userId, organizationId: activeOrg.id },
          'Invariant violated: organization has no projects. Check DB triggers that seed a default project on organization insert.',
        );
        return { kind: 'no-projects', organizationId: activeOrg.id } as const;
      }
      return { slug: fallback.slug };
    },
  });

  if (isLoading) {
    return <RedirectSpinner />;
  }

  // retry:false means the query errors permanently on the first failure.
  // Without this branch we fall through to `!resolved` → RedirectSpinner
  // forever, which happens when the bearer token isn't accepted yet on
  // first mount (pre-session-hydration) or when the server returns 401.
  if (resolveError) {
    return <FriendlyWorkspaceErrorPanel />;
  }

  if (!resolved) {
    return <RedirectSpinner />;
  }

  if ('slug' in resolved) {
    const routeBase = getAppRegistry().getDefaultRouteBase();
    return (
      <Navigate
        to={createProjectAppPath(resolved.slug, routeBase)}
        replace
      />
    );
  }

  return <FriendlyWorkspaceErrorPanel />;
}

function FriendlyWorkspaceErrorPanel() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="max-w-sm text-center">
        <h1 className="text-foreground text-lg font-semibold">
          <Trans
            i18nKey="common:landingWorkspaceErrorTitle"
            defaults="Your workspace isn't ready yet"
          />
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          <Trans
            i18nKey="common:landingWorkspaceErrorBody"
            defaults="We couldn't find a project to send you to. If this keeps happening, please contact support."
          />
        </p>
      </div>
    </div>
  );
}

function RedirectSpinner() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}
