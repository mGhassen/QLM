import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Database, Loader2 } from 'lucide-react';

import { useFlatRoute, useShell } from '@guepard/shell-runtime';

import { DatabaseDetailPage } from './components/detail-page';

export function DatabaseDetailFlatRoot() {
  const { t } = useTranslation('databases');
  const shell = useShell();
  const { params } = useFlatRoute();
  const id = params.id ?? '';

  const dbQuery = useQuery({
    queryKey: shell.databases.keys.detail(id),
    queryFn: () => shell.databases.get(id),
    enabled: !!id,
  });

  if (dbQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (dbQuery.isError || !dbQuery.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
        <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
          <Database className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-foreground text-base font-semibold">
          {t('list.errorTitle')}
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          {t('list.errorMessage')}
        </p>
      </div>
    );
  }

  return <DatabaseDetailPage database={dbQuery.data} />;
}
