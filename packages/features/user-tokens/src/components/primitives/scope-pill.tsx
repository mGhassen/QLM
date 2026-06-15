import { useTranslation } from 'react-i18next';

import type { UserTokenScope } from '@guepard/domain/entities';
import { Badge } from '@guepard/ui/badge';
import { cn } from '@guepard/ui/utils';

const SCOPE_CLASSES: Record<UserTokenScope, string> = {
  read: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  write:
    'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  admin:
    'border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300',
};

export type ScopePillProps = {
  scope: UserTokenScope;
};

/**
 * Inline scope pill — one per scope on a token row, in the canonical
 * `read / write / admin` order (sorted by `TokenRow`, not here).
 *
 * Color mapping:
 *  - read  → blue   (passive, observation-only)
 *  - write → amber  (mutation, caution)
 *  - admin → purple (elevated, all verbs)
 */
export function ScopePill({ scope }: Readonly<ScopePillProps>) {
  const { t } = useTranslation('tokens');
  return (
    <Badge variant="outline" className={cn(SCOPE_CLASSES[scope])}>
      {t(`scopes.${scope}`)}
    </Badge>
  );
}
