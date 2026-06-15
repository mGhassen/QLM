import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Gauge, Loader2 } from 'lucide-react';

import { useFlatRoute, useShell } from '@qlm/shell-runtime';

import { PerformanceProfileDetailPage } from './components/detail-page';

export function PerformanceProfileDetailFlatRoot() {
  const { t } = useTranslation('performance-profiles');
  const shell = useShell();
  const { params } = useFlatRoute();
  const id = params.id ?? '';

  const profileQuery = useQuery({
    queryKey: shell.performanceProfiles.keys.detail(id),
    queryFn: () => shell.performanceProfiles.get(id),
    enabled: !!id,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
        <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
          <Gauge className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-foreground text-base font-semibold">
          {t('detail.notFound.title')}
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          {t('detail.notFound.description')}
        </p>
      </div>
    );
  }

  return <PerformanceProfileDetailPage profile={profileQuery.data} />;
}
