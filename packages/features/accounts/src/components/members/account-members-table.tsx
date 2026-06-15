'use client';

import { useMemo, useState } from 'react';

import { ColumnDef } from '@tanstack/react-table';
import { Ellipsis } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Database } from '@guepard/supabase/database';
import { Badge } from '@guepard/ui/badge';
import { Button } from '@guepard/ui/button';
import { DataTable } from '@guepard/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@guepard/ui/dropdown-menu';
import { If } from '@guepard/ui/if';
import { Input } from '@guepard/ui/input';
import { ProfileAvatar } from '@guepard/ui/profile-avatar';
import { Trans } from '@guepard/ui/trans';

import { RemoveMemberDialog } from './remove-member-dialog';
import { RoleBadge } from './role-badge';
import { TransferOwnershipDialog } from './transfer-ownership-dialog';
import { UpdateMemberRoleDialog } from './update-member-role-dialog';

type Members =
  Database['public']['Functions']['get_organization_members']['Returns'];

type RemoveMemberCallback = (params: {
  organizationSlug: string;
  userId: string;
}) => Promise<{ success: boolean } | void>;

type UpdateRoleCallback = (params: {
  organizationSlug: string;
  userId: string;
  role: string;
}) => Promise<{ success: boolean } | void>;

interface Permissions {
  canUpdateRole: (roleHierarchy: number) => boolean;
  canRemoveFromAccount: (roleHierarchy: number) => boolean;
  canTransferOwnership: boolean;
}

type AccountMembersTableProps = {
  members: Members;
  currentUserId: string;
  currentOrganizationId: string;
  userRoleHierarchy: number;
  isPrimaryOwner: boolean;
  canManageRoles: boolean;
  organizationSlug: string;
  onRemove: RemoveMemberCallback;
  onUpdateRole: UpdateRoleCallback;
  disableTransferOwnership?: boolean;
  /**
   * When set, filters members with this query and hides the inline search field
   * (use the page-level EntityList toolbar search instead).
   */
  toolbarSearch?: string;
};

export function AccountMembersTable({
  members,
  currentUserId,
  currentOrganizationId,
  isPrimaryOwner,
  userRoleHierarchy,
  canManageRoles,
  organizationSlug,
  onRemove,
  onUpdateRole,
  disableTransferOwnership = false,
  toolbarSearch,
}: AccountMembersTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const { t } = useTranslation('organizations');
  const search = toolbarSearch !== undefined ? toolbarSearch : internalSearch;

  const permissions = useMemo(
    () => ({
      canUpdateRole: (targetRole: number) => {
        return (
          isPrimaryOwner || (canManageRoles && userRoleHierarchy < targetRole)
        );
      },
      canRemoveFromAccount: (targetRole: number) => {
        return (
          isPrimaryOwner || (canManageRoles && userRoleHierarchy < targetRole)
        );
      },
      canTransferOwnership: disableTransferOwnership ? false : isPrimaryOwner,
    }),
    [
      canManageRoles,
      isPrimaryOwner,
      userRoleHierarchy,
      disableTransferOwnership,
    ],
  );

  const columnsParams = useMemo(() => {
    return {
      currentUserId,
      currentOrganizationId,
      currentRoleHierarchy: userRoleHierarchy,
      organizationSlug,
      onRemove,
      onUpdateRole,
    };
  }, [
    currentUserId,
    currentOrganizationId,
    userRoleHierarchy,
    organizationSlug,
    onRemove,
    onUpdateRole,
  ]);

  const columns = useGetColumns(permissions, columnsParams);

  const filteredMembers = members
    .filter((member) => {
      const searchString = search.toLowerCase();
      const displayName = member.name ?? member.email.split('@')[0];

      return (
        displayName.toLowerCase().includes(searchString) ||
        member.email.toLowerCase().includes(searchString) ||
        member.role.toLowerCase().includes(searchString)
      );
    })
    .sort((prev, next) => {
      if (prev.user_id === currentUserId) return -1;
      if (next.user_id === currentUserId) return 1;

      if (prev.role_hierarchy_level < next.role_hierarchy_level) {
        return -1;
      }

      return 1;
    });

  return (
    <div className={'flex flex-col space-y-2'}>
      {toolbarSearch === undefined ? (
        <Input
          value={internalSearch}
          onInput={(e) =>
            setInternalSearch((e.target as HTMLInputElement).value)
          }
          placeholder={t(`searchMembersPlaceholder`, {
            defaultValue: 'Search members',
          })}
        />
      ) : null}

      <DataTable columns={columns} data={filteredMembers} />
    </div>
  );
}

function useGetColumns(
  permissions: Permissions,
  params: {
    currentUserId: string;
    currentOrganizationId: string;
    currentRoleHierarchy: number;
    organizationSlug: string;
    onRemove: RemoveMemberCallback;
    onUpdateRole: UpdateRoleCallback;
  },
): ColumnDef<Members[0]>[] {
  const { t } = useTranslation('teams');

  return useMemo(
    () => [
      {
        header: t('memberName'),
        size: 200,
        cell: ({ row }) => {
          const member = row.original;
          const displayName = member.name ?? member.email.split('@')[0];
          const isSelf = member.user_id === params.currentUserId;

          return (
            <span className={'flex items-center space-x-4 text-left'}>
              <span>
                <ProfileAvatar
                  displayName={displayName}
                  pictureUrl={member.picture_url}
                />
              </span>

              <span>{displayName}</span>

              <If condition={isSelf}>
                <Badge variant={'outline'}>{t('youLabel')}</Badge>
              </If>
            </span>
          );
        },
      },
      {
        header: t('emailLabel'),
        accessorKey: 'email',
        cell: ({ row }) => {
          return row.original.email ?? '-';
        },
      },
      {
        header: t('roleLabel'),
        cell: ({ row }) => {
          const { role, user_id, organization_user_id } = row.original;
          const isPrimaryOwner = user_id === organization_user_id;

          return (
            <span className={'flex items-center space-x-1'}>
              <RoleBadge role={role} />

              <If condition={isPrimaryOwner}>
                <span
                  className={
                    'rounded-md bg-yellow-400 px-2.5 py-1 text-xs font-medium dark:text-black'
                  }
                >
                  {t('primaryOwnerLabel')}
                </span>
              </If>
            </span>
          );
        },
      },
      {
        header: t('joinedAtLabel'),
        cell: ({ row }) => {
          return new Date(row.original.created_at).toLocaleDateString();
        },
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <ActionsDropdown
            permissions={permissions}
            member={row.original}
            currentUserId={params.currentUserId}
            currentOrganizationId={params.currentOrganizationId}
            currentRoleHierarchy={params.currentRoleHierarchy}
            organizationSlug={params.organizationSlug}
            onRemove={params.onRemove}
            onUpdateRole={params.onUpdateRole}
          />
        ),
      },
    ],
    [t, params, permissions],
  );
}

function ActionsDropdown({
  permissions,
  member,
  currentUserId,
  currentOrganizationId,
  currentRoleHierarchy,
  organizationSlug,
  onRemove,
  onUpdateRole,
}: {
  permissions: Permissions;
  member: Members[0];
  currentUserId: string;
  currentOrganizationId: string;
  currentRoleHierarchy: number;
  organizationSlug: string;
  onRemove: RemoveMemberCallback;
  onUpdateRole: UpdateRoleCallback;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const isCurrentUser = member.user_id === currentUserId;
  const isPrimaryOwner = member.user_id === member.organization_user_id;

  if (isCurrentUser || isPrimaryOwner) {
    return null;
  }

  const memberRoleHierarchy = member.role_hierarchy_level;
  const canUpdateRole = permissions.canUpdateRole(memberRoleHierarchy);

  const canRemoveFromAccount =
    permissions.canRemoveFromAccount(memberRoleHierarchy);

  // if has no permission to update role, transfer ownership or remove from account
  // do not render the dropdown menu
  if (
    !canUpdateRole &&
    !permissions.canTransferOwnership &&
    !canRemoveFromAccount
  ) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={'ghost'} size={'icon'}>
            <Ellipsis className={'h-5 w-5'} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <If condition={canUpdateRole}>
            <DropdownMenuItem onClick={() => setIsUpdatingRole(true)}>
              <Trans i18nKey={'organizations:updateRole'} />
            </DropdownMenuItem>
          </If>

          <If condition={permissions.canTransferOwnership}>
            <DropdownMenuItem onClick={() => setIsTransferring(true)}>
              <Trans i18nKey={'organizations:transferOwnership'} />
            </DropdownMenuItem>
          </If>

          <If condition={canRemoveFromAccount}>
            <DropdownMenuItem onClick={() => setIsRemoving(true)}>
              <Trans i18nKey={'organizations:removeMember'} />
            </DropdownMenuItem>
          </If>
        </DropdownMenuContent>
      </DropdownMenu>

      <If condition={isRemoving}>
        <RemoveMemberDialog
          isOpen={isRemoving}
          setIsOpen={setIsRemoving}
          organizationId={currentOrganizationId}
          userId={member.user_id}
          memberName={member.name}
          memberEmail={member.email}
          organizationSlug={organizationSlug}
          onRemove={onRemove}
        />
      </If>

      <If condition={isUpdatingRole}>
        <UpdateMemberRoleDialog
          isOpen={isUpdatingRole}
          setIsOpen={setIsUpdatingRole}
          userId={member.user_id}
          userRole={member.role}
          organizationId={currentOrganizationId}
          userRoleHierarchy={currentRoleHierarchy}
          organizationSlug={organizationSlug}
          onUpdateRole={onUpdateRole}
        />
      </If>

      <If condition={isTransferring}>
        <TransferOwnershipDialog
          isOpen
          setIsOpen={setIsTransferring}
          targetDisplayName={member.name ?? member.email}
          organizationId={member.organization_id}
          userId={member.user_id}
        />
      </If>
    </>
  );
}
