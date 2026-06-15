import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Server } from 'lucide-react';

import { useFlatRoute, useShell } from '@guepard/shell-runtime';

import { DetailPage } from './components/detail-page';

/**
 * Flat-route entry mounted at `/node/$nodeId`. The host catch-all
 * (`apps/web/src/routes/$flatPrefix.$.tsx`) resolves project context via
 * the app's `resolveProjectContext` and then renders this component
 * inside the project shell.
 */
export function FlatRoot() {
  const { t } = useTranslation('nodes');
  const shell = useShell();
  const { params } = useFlatRoute();
  const nodeId = params.nodeId ?? '';

  const nodeQuery = useQuery({
    queryKey: shell.nodes.keys.detail(nodeId),
    queryFn: () => shell.nodes.get(nodeId),
    enabled: !!nodeId,
  });

  if (nodeQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (nodeQuery.isError || !nodeQuery.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
        <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
          <Server className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-foreground text-base font-semibold">
          {t('title')}
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          {t('description')}
        </p>
      </div>
    );
  }

  return <DetailPage node={nodeQuery.data} projectSlug={shell.projectSlug} />;
}
