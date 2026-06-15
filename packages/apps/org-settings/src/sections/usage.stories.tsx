import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fn } from 'storybook/test';

import type { UsageSummary } from '@guepard/domain/usecases';
import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@guepard/shell-runtime';

import { OrgSettingsUsageSection } from './usage';

const orgSettingsEn = {
  sections: {
    usage: {
      title: 'Usage',
      description: 'See current balance and credits consumed.',
      refresh: 'Refresh',
      loading: 'Loading consumption summary…',
      currentBalance: 'Current balance',
      consumedInPeriod: 'Consumed in period',
      totalConsumed: 'Total consumed',
      totalPurchased: 'Total purchased',
      topUsersByCredits: 'Top users by credits',
      topProjectsByCredits: 'Top projects by credits',
      noUserConsumption: 'No user consumption yet.',
      noProjectConsumption: 'No project consumption yet.',
      error: {
        loadFailed: "Couldn't load usage for this organization.",
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

const organization = {
  id: 'o-1',
  slug: 'guepard',
  name: 'Rasm',
  userId: 'u-1',
};

const summary: UsageSummary = {
  balance: 4200,
  totalConsumed: 5800,
  totalPurchased: 10000,
  periodConsumed: 1200,
  topUsers: [
    { userId: 'u-1', userName: 'Hani Chalouati', credits: 900 },
    { userId: 'u-2', userName: 'Teammate', credits: 300 },
  ],
  topProjects: [
    { projectId: 'p-1', projectName: 'Rasm Console', credits: 700 },
    { projectId: 'p-2', projectName: 'Docs Search', credits: 500 },
  ],
};

type RepoOverride = {
  getUsageSummary?: () => Promise<UsageSummary>;
  findBySlug?: () => Promise<typeof organization | null>;
};

function makeShellValue(overrides: RepoOverride = {}): ShellAppContextValue {
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
      },
      usage: {
        getUsageSummary:
          overrides.getUsageSummary ?? (async () => summary),
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

const meta: Meta<typeof OrgSettingsUsageSection> = {
  title: 'Apps/OrgSettings/UsageSection',
  component: OrgSettingsUsageSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgSettingsUsageSection>;

function withProviders(shellValue: ShellAppContextValue) {
  return (Story: React.ComponentType) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <I18nextProvider i18n={storybookI18n}>
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={shellValue}>
            <div className="h-[720px] w-[1024px]">
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
        getUsageSummary: async () => ({
          balance: 0,
          totalConsumed: 0,
          totalPurchased: 0,
          periodConsumed: 0,
          topUsers: [],
          topProjects: [],
        }),
      }),
    ),
  ],
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
