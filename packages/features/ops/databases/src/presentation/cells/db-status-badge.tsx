import { useTranslation } from 'react-i18next';
import type { DatabaseStatus } from '@qlm/domain/entities';
import { cn } from '@qlm/ui/utils';
import { STATUS_BADGE } from '../../application/constants';

type DbStatusBadgeProps = Readonly<{
  status: DatabaseStatus;
  className?: string;
}>;

export function DbStatusBadge({ status, className }: DbStatusBadgeProps) {
  const { t } = useTranslation('databases');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border px-2 h-5',
        'text-[10px] font-black uppercase tracking-widest leading-none',
        STATUS_BADGE[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
