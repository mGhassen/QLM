import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fn } from 'storybook/test';

import type { TeamMember } from '@guepard/domain/entities';
import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@guepard/shell-runtime';

import { OrgSettingsMembersSection } from './members';

const orgSettingsEn = {
  sections: {
    members: {
      title: 'Members',
      inviteButton: 'Invite members',
      searchPlaceholder: 'Search by name or email',
      loading: 'Loading members…',
      columns: { member: 'Member', role: 'Role', joined: 'Joined' },
      empty: {
        title: 'No members yet',
        description: 'Invite teammates to collaborate on this organization.',
      },
      noAccess: {
        title: "You don't have access to this organization",
        description: 'Ask an administrator to add you to the organization.',
      },
      error: { loadFailed: "Couldn't load the organization." },
    },
  },
};

const commonEn = {
  roles: {
    owner: { label: 'Owner' },
    admin: { label: 'Admin' },
    member: { label: 'Member' },
  },
};

const storybookI18n = i18next.createInstance();
storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['org-settings', 'common'],
  defaultNS: 'org-settings',
  interpolation: { escapeValue: false },
  resources: {
    en: { 'org-settings': orgSettingsEn, common: commonEn },
  },
} as Parameters<typeof storybookI18n.init>[0]);

const organization = {
  id: 'o-1',
  slug: 'guepard',
  name: 'Rasm',
  userId: 'u-1',
};

const members: TeamMember[] = [
  {
    id: 'tm-1',
    userId: 'u-1',
    accountId: 'o-1',
    role: 'owner',
    roleHierarchyLevel: 0,
    primaryOwnerUserId: 'u-1',
    name: 'Hani Chalouati',
    email: 'hani@rasm.ai',
    pictureUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'tm-2',
    userId: 'u-2',
    accountId: 'o-1',
    role: 'admin',
    roleHierarchyLevel: 1,
    primaryOwnerUserId: 'u-1',
    name: 'Teammate',
    email: 'teammate@rasm.ai',
    pictureUrl: null,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
  },
];

type MembersRepoOverride = {
  getTeamMembers?: () => Promise<TeamMember[]>;
};

function makeShellValue(
  overrides: MembersRepoOverride = {},
): ShellAppContextValue {
  const asAny = (v: unknown) => v as never;
  return {
    projectId: 'p-1',
    projectSlug: 'guepard-console',
    orgSlug: organization.slug,
    currentUserId: 'u-1',
    repositories: asAny({
      organization: {
        findAll: async () => [organization],
        findById: async () => organization,
        findBySlug: async () => organization,
      },
      teamMember: {
        getTeamMembers: overrides.getTeamMembers ?? (async () => members),
        inviteTeamMember: fn(async () => ({})),
        updateTeamMemberRole: fn(async () => members[0]),
        removeTeamMember: fn(async () => undefined),
        leaveTeam: fn(async () => undefined),
        getRoles: async () => [
          { name: 'owner', hierarchyLevel: 0 },
          { name: 'admin', hierarchyLevel: 1 },
          { name: 'member', hierarchyLevel: 2 },
        ],
      },
      userPreferences: {
        get: async () => null,
        patch: async () => ({
          user_id: 'u-1',
          preferences: { last_project_by_org: {} },
          created_at: null,
          updated_at: null,
        }),
      },
    }),
    runQuery: fn(),
    testConnection: fn(),
    getDatasourceMetadata: fn(),
  };
}

const meta: Meta<typeof OrgSettingsMembersSection> = {
  title: 'Apps/OrgSettings/MembersSection',
  component: OrgSettingsMembersSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgSettingsMembersSection>;

function withProviders(shellValue: ShellAppContextValue) {
  return (Story: React.ComponentType) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <I18nextProvider i18n={storybookI18n}>
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={shellValue}>
            <div className="h-[640px] w-[960px]">
              <Story />
            </div>
          </ShellAppProvider>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

export const Default: Story = {
  decorators: [withProviders(makeShellValue())],
};

export const Empty: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        getTeamMembers: async () => [],
      }),
    ),
  ],
};

export const Loading: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        getTeamMembers: () => new Promise(() => undefined),
      }),
    ),
  ],
};

export const LoadError: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        getTeamMembers: async () => {
          throw new Error('boom');
        },
      }),
    ),
  ],
};
