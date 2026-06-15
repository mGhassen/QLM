import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { useShell } from '@guepard/shell-runtime';
import { Button } from '@guepard/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@guepard/ui/card';
import { cn } from '@guepard/ui/utils';

function formatCredits(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function readDateRangeFromUrl(): { from?: string; to?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  };
}

export function OrgSettingsUsageSection() {
  const { t } = useTranslation('org-settings');
  const shell = useShell();
  const orgSlug = shell.orgSlug;

  const { from, to } = useMemo(() => readDateRangeFromUrl(), []);

  const orgQuery = useQuery({
    queryKey: shell.organizations.keys.detail(orgSlug),
    queryFn: () => shell.organizations.getBySlug(orgSlug),
  });

  const summaryQuery = useQuery({
    enabled: !!orgQuery.data,
    queryKey: orgQuery.data
      ? shell.usage.keys.summary(orgQuery.data.id, from, to)
      : ['usage', 'summary', 'disabled'],
    queryFn: () =>
      shell.usage.getSummary({
        organizationId: orgQuery.data!.id,
        from,
        to,
      }),
  });

  if (orgQuery.isPending) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        {t('sections.usage.loading')}
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className="text-destructive p-6 text-sm">
        {t('sections.usage.error.loadFailed')}
      </div>
    );
  }

  const summary = summaryQuery.data;
  const balance = summary?.balance ?? 0;
  const totalConsumed = summary?.totalConsumed ?? 0;
  const totalPurchased = summary?.totalPurchased ?? 0;
  const periodConsumed = summary?.periodConsumed ?? 0;
  const topUsers = summary?.topUsers ?? [];
  const topProjects = summary?.topProjects ?? [];

  const isFetching = summaryQuery.isFetching;
  const handleRefresh = () => {
    if (orgQuery.data) {
      void shell.usage.invalidate.summary(orgQuery.data.id);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('sections.usage.title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('sections.usage.description')}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isFetching}
          aria-label={t('sections.usage.refresh')}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.currentBalance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {formatCredits(balance)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.consumedInPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {formatCredits(periodConsumed)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.totalConsumed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {formatCredits(totalConsumed)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.totalPurchased')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {formatCredits(totalPurchased)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.topUsersByCredits')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t('sections.usage.noUserConsumption')}
                </p>
              ) : (
                topUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="truncate text-sm">
                      {user.userName || `${user.userId.slice(0, 8)}…`}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCredits(user.credits)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('sections.usage.topProjectsByCredits')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t('sections.usage.noProjectConsumption')}
                </p>
              ) : (
                topProjects.map((project) => (
                  <div
                    key={project.projectId}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="truncate text-sm">
                      {project.projectName ||
                        `${project.projectId.slice(0, 8)}…`}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCredits(project.credits)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
