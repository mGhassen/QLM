import { useTranslation } from 'react-i18next';

import type { UserTokenStatus } from '@guepard/domain/entities';
import { Badge } from '@guepard/ui/badge';
import { cn } from '@guepard/ui/utils';

const STATUS_CLASSES: Record<UserTokenStatus, string> = {
  active:
    'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300',
  expired: 'border-border bg-muted text-muted-foreground',
  revoked: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
};

export type StatusChipProps = {
  status: UserTokenStatus;
};

/**
 * Inline status pill — reused by `TokenRow` and the create-pane preview.
 *
 * Color mapping (from spec §1 Q6 derivative):
 *  - active  → green  (all good, token works)
 *  - expired → muted  (no action available, time-decayed)
 *  - revoked → red    (explicitly blocked by user action)
 */
export function StatusChip({ status }: Readonly<StatusChipProps>) {
  const { t } = useTranslation('tokens');
  return (
    <Badge variant="outline" className={cn(STATUS_CLASSES[status])}>
      {t(`status.${status}`)}
    </Badge>
  );
}
