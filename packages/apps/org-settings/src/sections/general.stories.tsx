import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fn } from 'storybook/test';

import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@guepard/shell-runtime';

import { OrgSettingsGeneralSection } from './general';

const orgSettingsEn = {
  sections: {
    general: {
      title: 'General',
      fields: {
        name: 'Name',
        hideSidebar: {
          label: 'Hide project sidebar',
          description:
            'Remove the left sidebar for everyone in this organization.',
        },
      },
      save: 'Save changes',
      saving: 'Saving…',
      saved: 'Organization updated.',
      loading: 'Loading organization…',
      error: {
        saveFailed: "Couldn't save organization settings. Try again.",
        loadFailed: "Couldn't load this organization.",
      },
    },
  },
};

const storybookI18n = i18next.createInstance();
storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['org-settings'],
  defaultNS: 'org-settings',
  interpolation: { escapeValue: false },
  resources: { en: { 'org-settings': orgSettingsEn } },
} as Parameters<typeof storybookI18n.init>[0]);

type OrganizationStub = {
  id: string;
  slug: string;
  name: string;
  userId: string;
  hideSidebar: boolean;
};

const organization: OrganizationStub = {
  id: 'o-1',
  slug: 'guepard',
  name: 'Rasm',
  userId: 'u-1',
  hideSidebar: false,
};

type OrganizationRepoOverride = {
  findBySlug?: () => Promise<OrganizationStub | null>;
  update?: (
    input: Partial<OrganizationStub> & { id: string },
  ) => Promise<OrganizationStub>;
};

function makeShellValue(
  overrides: OrganizationRepoOverride = {},
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
        findBySlug: overrides.findBySlug ?? (async () => organization),
        update:
          overrides.update ??
          (async (input: Partial<OrganizationStub> & { id: string }) => ({
            ...organization,
            ...input,
          })),
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

const meta: Meta<typeof OrgSettingsGeneralSection> = {
  title: 'Apps/OrgSettings/GeneralSection',
  component: OrgSettingsGeneralSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgSettingsGeneralSection>;

function withProviders(shellValue: ShellAppContextValue) {
  return (Story: React.ComponentType) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <I18nextProvider i18n={storybookI18n}>
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={shellValue}>
            <div className="w-[640px]">
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

export const Loading: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        findBySlug: () => new Promise(() => undefined),
      }),
    ),
  ],
};

export const LoadError: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        findBySlug: async () => {
          throw new Error('boom');
        },
      }),
    ),
  ],
};
