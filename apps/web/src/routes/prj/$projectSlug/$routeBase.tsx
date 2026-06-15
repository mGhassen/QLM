import { Suspense, useMemo } from 'react';
import { createFileRoute, Navigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { decodeTabId, deriveTabTitle } from '@guepard/shell-contracts';

import { getAppRegistry } from '@/shell/app-registry';
import {
  ProjectShellHost,
  useProjectShellContextBySlug,
  type VirtualTab,
} from '@/shell/project-shell-host';
import pathsConfig, { createProjectAppPath } from '@/config/paths.config';
import { useDocumentTitle } from '@/lib/use-document-title';

const searchSchema = z
  .object({
    tid: z.string().optional(),
  })
  .passthrough();

export const Route = createFileRoute('/prj/$projectSlug/$routeBase')({
  validateSearch: searchSchema,
  component: ContextualAppRoute,
});

function ContextualAppRoute() {
  const { projectSlug, routeBase } = Route.useParams();
  const search = Route.useSearch();
  const { tid } = search;
  const docTitle =
    typeof search.docTitle === 'string' && search.docTitle.length > 0
      ? search.docTitle
      : undefined;
  const location = useLocation();
  const { t } = useTranslation('shell');

  const { organization, project, isLoading } =
    useProjectShellContextBySlug(projectSlug);
  const entry = getAppRegistry().getByRouteBase(routeBase);

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

  const decodedTab = tid ? decodeTabId(tid) : null;
  const tabTitle = decodedTab
    ? decodedTab.kind === 'studio-doc' && docTitle
      ? docTitle
      : deriveTabTitle(decodedTab, { t, providers: providerLabels })
    : (entry?.manifest.displayName ?? routeBase);

  useDocumentTitle(tabTitle);

  if (!entry) {
    const fallbackRouteBase = getAppRegistry().getDefaultRouteBase();
    if (fallbackRouteBase !== routeBase) {
      return (
        <Navigate
          to={createProjectAppPath(projectSlug, fallbackRouteBase)}
          replace
        />
      );
    }
    return <Navigate to={pathsConfig.app.home} replace />;
  }

  if (isLoading || !organization || !project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const { Root } = entry;

  const virtualTab: VirtualTab | undefined =
    tid && decodedTab
      ? {
          id: tid,
          title: tabTitle,
          href: location.href,
        }
      : undefined;

  return (
    <ProjectShellHost
      orgSlug={organization.slug}
      projectSlug={projectSlug}
      organization={organization}
      project={project}
      activeTabId={tid ?? routeBase}
      virtualTab={virtualTab}
    >
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        }
      >
        <Root />
      </Suspense>
    </ProjectShellHost>
  );
}
