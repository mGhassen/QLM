import { Suspense, useMemo } from 'react';
import { createFileRoute, Navigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  decodeTabId,
  deriveTabTitle,
  makeFlatTabId,
} from '@qlm/shell-contracts';
import { FlatRouteProvider } from '@qlm/shell-runtime';
import { GetProjectService } from '@qlm/domain/services';

import { getAppRegistry } from '@/shell/app-registry';
import { ProjectShellHost } from '@/shell/project-shell-host';
import { useWorkspace } from '@/lib/context/workspace-context';
import { createFlatPath } from '@/config/paths.config';
import { useDocumentTitle } from '@/lib/use-document-title';

export const Route = createFileRoute('/$flatPrefix/$')({
  component: FlatRoute,
});

const registry = getAppRegistry();

/**
 * Generic catch-all for flat short URLs like `/notebook/{slug}`.
 *
 * - Reads the first segment (`flatPrefix`) and the remainder (`_splat`)
 * - Looks up an app by flat prefix in the registry
 * - Parses splat segments into typed params using `manifest.flatRoute.params`
 * - Resolves project context via the app's `resolveProjectContext`
 * - Renders the shell layout + the app's FlatRoot
 */
function FlatRoute() {
  const { flatPrefix, _splat } = useParams({ strict: false }) as {
    flatPrefix: string;
    _splat: string;
  };

  const { t } = useTranslation('shell');
  const { repositories } = useWorkspace();
  const entry = registry.getByFlatPrefix(flatPrefix);
  const flatRootElement = registry.renderFlatRoot(flatPrefix);

  // ── Parse splat into named params ─────────────────────────────────────
  const splatSegments = (_splat ?? '').split('/').filter(Boolean);
  const paramNames = registry.getFlatRouteParams(flatPrefix);
  const flatParams: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    const value = splatSegments[i];
    if (value) flatParams[name] = value;
  });

  // ── Resolve project context from the app's resolver ──────────────────
  const { data: resolved, isLoading: isResolving } = useQuery({
    queryKey: ['flat-project-context', flatPrefix, flatParams],
    queryFn: async () => {
      if (!entry?.resolveProjectContext) return null;
      return entry.resolveProjectContext(flatParams, { repositories });
    },
    enabled: !!entry?.resolveProjectContext,
  });

  const projectId = resolved?.projectId ?? null;

  // ── Fetch project + organization once we have the ID ─────────────────
  const { data: project } = useQuery({
    queryKey: ['project-by-id', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const service = new GetProjectService(repositories.project);
      return service.execute(projectId);
    },
    enabled: !!projectId,
  });

  const { data: organization } = useQuery({
    queryKey: ['organization-by-id', project?.organizationId],
    queryFn: async () => {
      if (!project) return null;
      return repositories.organization.findById(project.organizationId);
    },
    enabled: !!project,
  });

  const providerLabels = useMemo(
    () => ({
      aws: t('tab.provider.aws'),
      gcp: t('tab.provider.gcp'),
      azure: t('tab.provider.azure'),
      'on-premise': t('tab.provider.on-premise'),
      unknown: t('tab.provider.unknown'),
    }),
    [t],
  );

  const firstParamValue = paramNames[0]
    ? (flatParams[paramNames[0]] ?? '')
    : '';

  // Use the canonical encoded tab ID returned by resolveProjectContext when
  // available — this ensures the flat route and the contextual route produce
  // the same tab ID for the same entity, preventing duplicate tabs.
  const virtualId =
    resolved?.tabId ?? makeFlatTabId(flatPrefix, firstParamValue);
  const decodedTab = resolved?.tabId ? decodeTabId(resolved.tabId) : null;
  const virtualTitle = decodedTab
    ? deriveTabTitle(decodedTab, { t, providers: providerLabels })
    : firstParamValue;

  useDocumentTitle(virtualTitle || null);

  // ── Error / loading states ────────────────────────────────────────────
  if (!entry || !flatRootElement) {
    return <Navigate to="/organizations" replace />;
  }

  if (isResolving || !projectId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!project || !organization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const virtualHref = createFlatPath(flatPrefix, ...splatSegments);

  return (
    <ProjectShellHost
      orgSlug={organization.slug}
      projectSlug={project.slug}
      organization={organization}
      project={project}
      activeTabId={virtualId}
      virtualTab={{
        id: virtualId,
        title: virtualTitle,
        href: virtualHref,
      }}
    >
      <FlatRouteProvider value={{ prefix: flatPrefix, params: flatParams }}>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          }
        >
          {flatRootElement}
        </Suspense>
      </FlatRouteProvider>
    </ProjectShellHost>
  );
}
