import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@qlm/shell-runtime';

import { ShellTopbar } from './shell-topbar';

/**
 * Minimal repository stubs so `useShell()` returns fake orgs + projects. Every
 * promise resolves immediately; create mutations log via fn() so the Storybook
 * Actions panel shows them.
 */
function makeShellValue(): ShellAppContextValue {
  const orgs = [
    { id: 'o-1', slug: 'qlm', name: 'QLM', user_id: 'u-1' },
    { id: 'o-2', slug: 'contoso', name: 'Contoso', user_id: 'u-1' },
  ];
  const projects = [
    {
      id: 'p-1',
      slug: 'qlm-console',
      name: 'QLM Console',
      organizationId: 'o-1',
    },
    {
      id: 'p-2',
      slug: 'docs-search',
      name: 'Docs Search',
      organizationId: 'o-1',
    },
  ];
  const asAny = (v: unknown) => v as never;

  return {
    projectId: 'p-1',
    projectSlug: 'qlm-console',
    orgSlug: 'qlm',
    organizationId: 'org-1',
    currentUserId: 'u-1',
    repositories: asAny({
      organization: {
        findAll: async () => orgs,
        findById: async (id: string) => orgs.find((o) => o.id === id) ?? null,
        findBySlug: async (slug: string) =>
          orgs.find((o) => o.slug === slug) ?? null,
      },
      project: {
        findAll: async () => projects,
        findById: async (id: string) =>
          projects.find((p) => p.id === id) ?? null,
        findBySlug: async (slug: string) =>
          projects.find((p) => p.slug === slug) ?? null,
        findAllByOrganizationId: async (orgId: string) =>
          projects.filter((p) => p.organizationId === orgId),
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

const meta: Meta<typeof ShellTopbar> = {
  title: 'Features/ShellTopbar/ShellTopbar',
  component: ShellTopbar,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={makeShellValue()}>
            <div className="p-6">
              <Story />
            </div>
          </ShellAppProvider>
        </QueryClientProvider>
      );
    },
  ],
  args: {
    onNavigate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ShellTopbar>;

export const DefaultClosed: Story = {};
