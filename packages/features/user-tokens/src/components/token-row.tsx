import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  deriveUserTokenStatus,
  type UserToken,
  type UserTokenScope,
} from '@guepard/domain/entities';
import { Button } from '@guepard/ui/button';

import { ScopePill } from './primitives/scope-pill';
import { StatusChip } from './primitives/status-chip';

/**
 * Canonical render order for the scopes column. Sorting here (not at the
 * schema level) keeps the row decoupled from the enum's emit order.
 */
const SCOPE_ORDER: UserTokenScope[] = ['read', 'write', 'admin'];

function sortScopes(scopes: UserTokenScope[]): UserTokenScope[] {
  return SCOPE_ORDER.filter((scope) => scopes.includes(scope));
}

function formatExpires(expiresUnix: number): string {
  return format(new Date(expiresUnix * 1000), 'PP');
}

function formatIso(iso: string | null): string | null {
  if (!iso) return null;
  return format(new Date(iso), 'PP');
}

export type TokenRowProps = {
  token: UserToken;
  onRevokeClick: (token: UserToken) => void;
};

/**
 * Single 7-column `<tr>` for the tokens table. Composed by `TokenListView`
 * (Story 010) inside a `<table><tbody>`.
 *
 * Columns (per spec §3.2.1):
 *   1. Name           — token.token_name
 *   2. Expires        — formatted from token.expires_at (Unix seconds)
 *   3. Status         — derived chip
 *   4. Created At     — formatted from token.created_at (ISO string)
 *   5. Revoked At     — formatted ISO or i18n N/A
 *   6. Scopes         — sorted ScopePill array (read → write → admin)
 *   7. Actions        — revoke icon button, disabled for non-active tokens
 */
export function TokenRow({ token, onRevokeClick }: Readonly<TokenRowProps>) {
  const { t } = useTranslation('tokens');
  const status = deriveUserTokenStatus({
    revoked: token.revoked,
    expires_at: token.expires_at,
  });
  const isActive = status === 'active';
  const revokedAt = formatIso(token.revoked_at);

  return (
    <tr className="border-b">
      <td className="px-3 py-2 text-sm font-medium">{token.token_name}</td>
      <td className="text-muted-foreground px-3 py-2 text-sm">
        {formatExpires(token.expires_at)}
      </td>
      <td className="px-3 py-2 text-sm">
        <StatusChip status={status} />
      </td>
      <td className="text-muted-foreground px-3 py-2 text-sm">
        {formatIso(token.created_at) ?? t('table.notApplicable')}
      </td>
      <td className="text-muted-foreground px-3 py-2 text-sm">
        {revokedAt ?? t('table.notApplicable')}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          {sortScopes(token.scopes).map((scope) => (
            <ScopePill key={scope} scope={scope} />
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('table.revokeAriaLabel')}
          disabled={!isActive}
          onClick={() => onRevokeClick(token)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
