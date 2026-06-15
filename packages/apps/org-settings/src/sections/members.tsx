import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react';

import {
  InviteMembersDialogContainer,
  RoleBadge,
} from '@guepard/accounts/components';
import type { TeamMember } from '@guepard/domain/entities';
import { useShell, useShellApp } from '@guepard/shell-runtime';
import { Button } from '@guepard/ui/button';
import {
  EntityDateCell,
  EntityListPage,
  EntityListTable,
  EntityNameCell,
  type EntityListColumn,
} from '@guepard/ui/entity-list';

export function OrgSettingsMembersSection() {
  const { t } = useTranslation('org-settings');
  const shell = useShell();
  const { currentUserId } = useShellApp();
  const orgSlug = shell.orgSlug;

  const [search, setSearch] = useState('');

  const orgQuery = useQuery({
    queryKey: shell.organizations.keys.detail(orgSlug),
    queryFn: () => shell.organizations.getBySlug(orgSlug),
  });

  const membersQuery = useQuery({
    queryKey: shell.teamMembers.keys.listByOrgSlug(orgSlug),
    queryFn: () => shell.teamMembers.list({ organizationSlug: orgSlug }),
    enabled: !!orgQuery.data,
  });

  const members = membersQuery.data ?? [];
  const me = members.find((m) => m.userId === currentUserId);
  const isPrimaryOwner = me ? me.userId === me.primaryOwnerUserId : false;
  const userRoleHierarchy = me?.roleHierarchyLevel ?? Number.MAX_SAFE_INTEGER;
  const canManageRoles = isPrimaryOwner || userRoleHierarchy <= 1;

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const haystack = `${member.name ?? ''} ${member.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [members, search]);

  const onInvite = async ({
    invitations,
    organizationSlug,
  }: {
    invitations: ReadonlyArray<{ email: string; role: string }>;
    organizationSlug: string;
  }) => {
    await Promise.all(
      invitations.map((invitation) =>
        shell.teamMembers.invite({
          organizationSlug,
          email: invitation.email,
          role: invitation.role,
        }),
      ),
    );
    await shell.teamMembers.invalidate.listByOrgSlug(orgSlug);
  };

  const columns: EntityListColumn<TeamMember>[] = [
    {
      key: 'name',
      label: t('sections.members.columns.member'),
      render: (member) => (
        <EntityNameCell
          icon={User}
          name={member.name || member.email}
          subtitle={member.email}
        />
      ),
    },
    {
      key: 'role',
      label: t('sections.members.columns.role'),
      width: '160px',
      render: (member) => <RoleBadge role={member.role} />,
    },
    {
      key: 'joined',
      label: t('sections.members.columns.joined'),
      width: '220px',
      render: (member) => <EntityDateCell date={member.createdAt} />,
    },
  ];

  if (orgQuery.isPending || membersQuery.isPending) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        {t('sections.members.loading')}
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className="text-destructive p-6 text-sm">
        {t('sections.members.error.loadFailed')}
      </div>
    );
  }

  return (
    <EntityListPage
      title={t('sections.members.title')}
      searchPlaceholder={t('sections.members.searchPlaceholder')}
      searchValue={search}
      onSearchChange={setSearch}
      primarySlot={
        canManageRoles ? (
          <InviteMembersDialogContainer
            organizationSlug={orgSlug}
            userRoleHierarchy={userRoleHierarchy}
            onInvite={onInvite}
          >
            <Button
              type="button"
              data-test="invite-members-trigger"
              className="h-10 gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('sections.members.inviteButton')}
            </Button>
          </InviteMembersDialogContainer>
        ) : undefined
      }
    >
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {t('sections.members.empty.title')}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('sections.members.empty.description')}
          </p>
        </div>
      ) : !me ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {t('sections.members.noAccess.title')}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('sections.members.noAccess.description')}
          </p>
        </div>
      ) : (
        <EntityListTable
          columns={columns}
          items={filteredMembers}
          getRowId={(member) => member.id}
        />
      )}
    </EntityListPage>
  );
}
