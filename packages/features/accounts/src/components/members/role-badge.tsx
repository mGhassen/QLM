import { cva } from 'class-variance-authority';

import { Badge } from '@guepard/ui/badge';
import { Trans } from '@guepard/ui/trans';

type Role = 'owner' | 'administrator' | 'analyst' | 'viewer' | string;

const roles = {
  owner:
    'bg-amber-50 hover:bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/10 dark:text-amber-400',
  administrator:
    'bg-purple-50 hover:bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:hover:bg-purple-500/10 dark:text-purple-400',
  analyst:
    'bg-blue-50 hover:bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/10 dark:text-blue-400',
  viewer:
    'bg-gray-50 hover:bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:hover:bg-gray-500/10 dark:text-gray-400',
} as const;

const roleClassNameBuilder = cva('font-medium capitalize shadow-none', {
  variants: {
    role: roles,
  },
});

export const RoleBadge: React.FC<{
  role: Role;
}> = ({ role }) => {
  const className = roleClassNameBuilder({
    role: role in roles ? (role as keyof typeof roles) : undefined,
  });
  const isCustom = !(role in roles);

  return (
    <Badge className={className} variant={isCustom ? 'outline' : 'default'}>
      <span data-test={'member-role-badge'}>
        <Trans i18nKey={`common:roles.${role}.label`} defaults={role} />
      </span>
    </Badge>
  );
};
