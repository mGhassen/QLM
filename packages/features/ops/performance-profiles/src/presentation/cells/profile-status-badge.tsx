import { useTranslation } from 'react-i18next';

import { cn } from '@guepard/ui/utils';

import { STATUS_BADGE } from '../../application/constants';

type ProfileStatusBadgeProps = Readonly<{
  isActive: boolean;
  className?: string;
}>;

export function ProfileStatusBadge({ isActive, className }: ProfileStatusBadgeProps) {
  const { t } = useTranslation('performance-profiles');
  const statusKey = isActive ? 'active' : 'inactive';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border px-2 h-5',
        'text-[10px] font-bold tracking-tight leading-none',
        STATUS_BADGE[statusKey],
        className,
      )}
    >
      {t(`status.${statusKey}`)}
    </span>
  );
}
