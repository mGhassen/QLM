import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { IntegrationTestStatus } from '@qlm/domain/entities';
import { Badge } from '@qlm/ui/badge';
import { cn } from '@qlm/ui/utils';

export type IntegrationStatusBadgeProps = Readonly<{
  status: IntegrationTestStatus;
}>;

const statusIcon: Record<
  IntegrationTestStatus,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  success: CheckCircle2,
  failed: XCircle,
  untested: Circle,
};

export function IntegrationStatusBadge(
  props: IntegrationStatusBadgeProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { status } = props;
  const Icon = statusIcon[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        status === 'success' &&
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        status === 'failed' &&
          'border-destructive/40 bg-destructive/10 text-destructive',
        status === 'untested' && 'text-muted-foreground',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {t(`test.status.${status}`)}
    </Badge>
  );
}
