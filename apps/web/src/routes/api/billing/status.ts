import { createFileRoute } from '@tanstack/react-router';

import type { Order } from '@qlm/domain/entities';
import {
  GetOrdersByOrganizationIdService,
  GetOrganizationBillingService,
  GetOrganizationBySlugService,
} from '@qlm/domain/services';

import { createServerRepositories } from '@/lib/repositories-factory.server';

/**
 * GET /api/billing/status?orgSlug=xxx
 *
 * Returns fresh balance and invoices count for the given organization. Used
 * by the billing page to poll after a Stripe payment return so it can detect
 * when the webhook has persisted the purchase.
 */
export const Route = createFileRoute('/api/billing/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orgSlug = url.searchParams.get('orgSlug');

        if (!orgSlug) {
          return Response.json(
            { error: 'orgSlug is required' },
            { status: 400 },
          );
        }

        try {
          const repositories = createServerRepositories(request);

          const organization = await new GetOrganizationBySlugService(
            repositories.organization,
          ).execute(orgSlug);

          if (!organization) {
            return Response.json(
              { error: 'Organization not found' },
              { status: 404 },
            );
          }

          const billingData = await new GetOrganizationBillingService(
            repositories.organization,
          ).execute(organization.id);

          const orders = await new GetOrdersByOrganizationIdService(
            repositories.order,
          ).execute(organization.id);

          const stripeOrders = orders.filter(
            (order: Order) => order.billingProvider === 'stripe',
          );

          return Response.json({
            balance: billingData.balance,
            invoicesCount: stripeOrders.length,
          });
        } catch (error) {
          console.error('Error in billing status loader:', error);
          return Response.json(
            { error: 'Failed to load billing status' },
            { status: 500 },
          );
        }
      },
    },
  },
});
