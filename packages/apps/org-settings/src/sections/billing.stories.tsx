import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fn } from 'storybook/test';

import type { Order } from '@qlm/domain/entities';
import type { OrganizationBillingData } from '@qlm/domain/usecases';
import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@qlm/shell-runtime';

import { OrgSettingsBillingSection } from './billing';

const orgSettingsEn = {
  sections: {
    billing: {
      title: 'Billing & usage',
      loading: 'Loading billing…',
      error: {
        loadFailed: "Couldn't load billing for this organization.",
      },
    },
  },
};

const organizationsEn = {
  billing: {
    creditBalanceTitle: 'Credit balance',
    creditBalanceDescription:
      'Your credit balance is consumed as you use QLM. You can buy credits at any time.',
    remainingBalance: 'You still have {{balance}} credits left.',
    buyCredits: { triggerButton: 'Buy credits' },
    invoiceHistory: {
      title: 'Invoice history',
      description:
        'Invoices are issued when credits are purchased. All dates are in {{timezone}} timezone.',
      columns: {
        date: 'Date',
        type: 'Invoice Type',
        status: 'Status',
        cost: 'Cost',
        actions: 'Actions',
      },
      empty: 'No invoices found',
      download: 'Download',
      view: 'View',
      type: {
        monthlyInvoice: 'Monthly invoice',
        creditGrant: 'Credit grant',
        creditPurchase: 'Credit purchase',
      },
      status: {
        paid: 'Paid',
        pending: 'Pending',
        failed: 'Failed',
        expiring: 'Expiring',
      },
    },
  },
};

const storybookI18n = i18next.createInstance();
storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['org-settings', 'organizations'],
  defaultNS: 'org-settings',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      'org-settings': orgSettingsEn,
      organizations: organizationsEn,
    },
  },
} as Parameters<typeof storybookI18n.init>[0]);

const organization = {
  id: 'o-1',
  slug: 'qlm',
  name: 'QLM',
  userId: 'u-1',
};

const billingData: OrganizationBillingData = {
  balance: 4200,
  totalPurchased: 10000,
  totalConsumed: 5800,
  totalAllocated: 10000,
  accountId: 'o-1',
};

const orders: Order[] = [
  {
    id: 'order-1',
    organizationId: 'o-1',
    customerId: 'cus_test',
    status: 'succeeded',
    billingProvider: 'stripe',
    totalAmount: 5000,
    currency: 'USD',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
  },
  {
    id: 'order-2',
    organizationId: 'o-1',
    customerId: 'cus_test',
    status: 'pending',
    billingProvider: 'stripe',
    totalAmount: 2500,
    currency: 'USD',
    createdAt: new Date('2026-04-12T00:00:00Z'),
    updatedAt: new Date('2026-04-12T00:00:00Z'),
  },
];

type RepoOverride = {
  getBillingData?: () => Promise<OrganizationBillingData>;
  findByOrganizationId?: () => Promise<Order[]>;
  findBySlug?: () => Promise<typeof organization | null>;
};

function makeShellValue(overrides: RepoOverride = {}): ShellAppContextValue {
  const asAny = (v: unknown) => v as never;
  return {
    projectId: 'p-1',
    projectSlug: 'qlm-console',
    orgSlug: organization.slug,
    currentUserId: 'u-1',
    repositories: asAny({
      organization: {
        findAll: async () => [organization],
        findById: async () => organization,
        findBySlug: overrides.findBySlug ?? (async () => organization),
        getBillingData:
          overrides.getBillingData ?? (async () => billingData),
      },
      order: {
        findByOrganizationId:
          overrides.findByOrganizationId ?? (async () => orders),
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

const meta: Meta<typeof OrgSettingsBillingSection> = {
  title: 'Apps/OrgSettings/BillingSection',
  component: OrgSettingsBillingSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgSettingsBillingSection>;

function withProviders(shellValue: ShellAppContextValue) {
  return (Story: React.ComponentType) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <I18nextProvider i18n={storybookI18n}>
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={shellValue}>
            <div className="h-[720px] w-[960px]">
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

export const NoInvoices: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        findByOrganizationId: async () => [],
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
