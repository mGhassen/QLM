import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  deriveUserTokenStatus,
  type UserToken,
  type UserTokenScope,
  type UserTokenStatus,
} from '@guepard/domain/entities';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import { Input } from '@guepard/ui/input';
import { Skeleton } from '@guepard/ui/skeleton';

import { useUserTokensQuery } from '../hooks/use-user-tokens-query';
import { FilterPopover } from './primitives/filter-popover';
import { TokenRow } from './token-row';

const STATUS_OPTIONS_KEYS: ReadonlyArray<UserTokenStatus> = [
  'active',
  'expired',
  'revoked',
];

const SCOPE_OPTIONS_KEYS: ReadonlyArray<UserTokenScope> = [
  'read',
  'write',
  'admin',
];

export type TokenListViewProps = {
  onGenerateClick: () => void;
  onRevokeClick: (token: UserToken) => void;
};

/**
 * "list" pane state — header + toolbar + table. Renders empty / loading /
 * error branches when the underlying query returns those.
 *
 * Filter logic is purely client-side: phase-1 lists are short enough that
 * a server round-trip per filter change would feel sluggish.
 */
export function TokenListView({
  onGenerateClick,
  onRevokeClick,
}: Readonly<TokenListViewProps>) {
  const { t } = useTranslation('tokens');
  const query = useUserTokensQuery();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserTokenStatus[]>([]);
  const [scopesFilter, setScopesFilter] = useState<UserTokenScope[]>([]);

  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS_KEYS.map((value) => ({
        value,
        label: t(`status.${value}`),
      })),
    [t],
  );
  const scopeOptions = useMemo(
    () =>
      SCOPE_OPTIONS_KEYS.map((value) => ({
        value,
        label: t(`scopes.${value}`),
      })),
    [t],
  );

  const visibleRows = useMemo(() => {
    if (!query.data) return [];
    const lowerSearch = search.trim().toLowerCase();
    return query.data.filter((row) => {
      if (lowerSearch && !row.token_name.toLowerCase().includes(lowerSearch))
        return false;
      if (statusFilter.length > 0) {
        const status = deriveUserTokenStatus({
          revoked: row.revoked,
          expires_at: row.expires_at,
        });
        if (!statusFilter.includes(status)) return false;
      }
      if (scopesFilter.length > 0) {
        const overlaps = row.scopes.some((s) => scopesFilter.includes(s));
        if (!overlaps) return false;
      }
      return true;
    });
  }, [query.data, search, statusFilter, scopesFilter]);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-test="token-list-loading">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive" data-test="token-list-error">
        <AlertTitle>{t('errors.listHeading')}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>{t('errors.generic')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            className="self-start"
          >
            {t('errors.retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if ((query.data ?? []).length === 0) {
    return (
      <div
        data-test="token-list-empty"
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      >
        <h3 className="text-foreground text-base font-semibold">
          {t('empty.heading')}
        </h3>
        <p className="text-muted-foreground max-w-md text-sm">
          {t('empty.body')}
        </p>
        <Button onClick={onGenerateClick} className="mt-2">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('empty.action')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-test="token-list-content">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">
          {t('page.title')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('page.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('toolbar.searchPlaceholder')}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <FilterPopover<UserTokenStatus>
          label={t('toolbar.status')}
          options={statusOptions}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterPopover<UserTokenScope>
          label={t('toolbar.scopes')}
          options={scopeOptions}
          selected={scopesFilter}
          onChange={setScopesFilter}
        />
        <Button
          onClick={onGenerateClick}
          className="ml-auto"
          data-test="token-list-generate"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t('toolbar.generate')}
        </Button>
      </div>

      <table className="w-full border-collapse">
        <thead className="border-b">
          <tr className="text-muted-foreground text-left text-xs font-medium uppercase">
            <th className="px-3 py-2">{t('table.name')}</th>
            <th className="px-3 py-2">{t('table.expires')}</th>
            <th className="px-3 py-2">{t('table.status')}</th>
            <th className="px-3 py-2">{t('table.createdAt')}</th>
            <th className="px-3 py-2">{t('table.revokedAt')}</th>
            <th className="px-3 py-2">{t('table.scopes')}</th>
            <th className="px-3 py-2 text-right">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <TokenRow key={row.id} token={row} onRevokeClick={onRevokeClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
