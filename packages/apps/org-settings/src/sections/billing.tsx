import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { BillingUI, type Invoice } from '@guepard/billing/components';
import type { Order } from '@guepard/domain/entities';
import { useShell } from '@guepard/shell-runtime';

function orderToInvoice(order: Order): Invoice {
  return {
    id: order.id,
    date: order.createdAt,
    invoiceType: 'credit_purchase' as const,
    status:
      order.status === 'succeeded'
        ? 'paid'
        : order.status === 'pending'
          ? 'pending'
          : 'failed',
    cost: order.totalAmount / 100,
  };
}

export function OrgSettingsBillingSection() {
  const { t } = useTranslation('org-settings');
  const shell = useShell();
  const orgSlug = shell.orgSlug;

  const orgQuery = useQuery({
    queryKey: shell.organizations.keys.detail(orgSlug),
    queryFn: () => shell.organizations.getBySlug(orgSlug),
  });

  const billingQuery = useQuery({
    enabled: !!orgQuery.data,
    queryKey: orgQuery.data
      ? shell.organizations.keys.billing(orgQuery.data.id)
      : ['organization', 'billing', 'disabled'],
    queryFn: () => shell.organizations.getBilling(orgQuery.data!.id),
  });

  const ordersQuery = useQuery({
    enabled: !!orgQuery.data,
    queryKey: orgQuery.data
      ? shell.orders.keys.listByOrganization(orgQuery.data.id)
      : ['orders', 'disabled'],
    queryFn: () => shell.orders.list({ organizationId: orgQuery.data!.id }),
  });

  const handleViewInvoice = useCallback(async (invoiceId: string) => {
    window.open(
      `/api/billing/invoice?orderId=${encodeURIComponent(invoiceId)}&action=view`,
      '_blank',
    );
  }, []);

  const handleDownloadInvoice = useCallback(async (invoiceId: string) => {
    window.open(
      `/api/billing/invoice?orderId=${encodeURIComponent(invoiceId)}&action=download`,
      '_blank',
    );
  }, []);

  if (orgQuery.isPending) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        {t('sections.billing.loading')}
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className="text-destructive p-6 text-sm">
        {t('sections.billing.error.loadFailed')}
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];
  const stripeOrders = orders.filter((order) => order.billingProvider === 'stripe');
  const invoices: Invoice[] = stripeOrders.map(orderToInvoice);
  const balance = billingQuery.data?.balance ?? 0;
  const currencyCode = stripeOrders[0]?.currency?.toUpperCase() || 'USD';

  return (
    <div className="flex h-full flex-col">
      <header className="border-b p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('sections.billing.title')}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <BillingUI
          orgSlug={orgSlug}
          balance={balance}
          currencyCode={currencyCode}
          invoices={invoices}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
        />
      </div>
    </div>
  );
}
