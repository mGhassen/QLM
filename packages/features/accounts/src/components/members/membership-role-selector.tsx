import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qlm/ui/select';
import { Trans } from '@qlm/ui/trans';
import { cn } from '@qlm/ui/utils';

type Role = string;

export const MembershipRoleSelector: React.FC<{
  roles: Role[];
  value: Role;
  currentUserRole?: Role;
  onChange: (role: Role) => unknown;
  triggerClassName?: string;
  placeholder?: string;
}> = ({
  roles,
  value,
  currentUserRole,
  onChange,
  triggerClassName,
  placeholder = 'Select role',
}) => {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        data-test={'role-selector-trigger'}
        className={cn('h-9 w-full min-w-[140px] rounded-md', triggerClassName)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {roles.map((role) => {
          return (
            <SelectItem
              key={role}
              data-test={`role-option-${role}`}
              disabled={currentUserRole === role}
              value={role}
            >
              <span className={'text-sm capitalize'}>
                <Trans i18nKey={`common:roles.${role}.label`} defaults={role} />
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
