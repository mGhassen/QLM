import { createFileRoute } from '@tanstack/react-router';

import {
  getInvoiceIdFromPaymentIntent,
  getStripeInvoicePdfUrl,
  getStripeInvoiceUrl,
} from '@guepard/billing/services';

/**
 * Extract the Stripe payment intent id from an order id.
 *
 * Orders are keyed on the payment intent id (`pi_...`). A legacy format had
 * a doubled prefix (`pi_pi_...`); strip it if seen.
 */
function extractPaymentIntentId(orderId: string): string | null {
  if (!orderId) return null;
  if (orderId.startsWith('pi_pi_')) return orderId.substring(3);
  if (orderId.startsWith('pi_')) return orderId;
  return orderId;
}

/**
 * GET /api/billing/invoice?orderId=pi_xxx&action=view|download
 *
 * Redirects to the Stripe-hosted invoice URL (view) or the invoice PDF
 * (download).
 */
export const Route = createFileRoute('/api/billing/invoice')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get('orderId');
        const action = url.searchParams.get('action') || 'view';

        if (!orderId) {
          return Response.json(
            { error: 'Order ID is required' },
            { status: 400 },
          );
        }

        try {
          const paymentIntentId = extractPaymentIntentId(orderId);
          if (!paymentIntentId) {
            return Response.json(
              { error: 'Invalid order ID format' },
              { status: 400 },
            );
          }

          const invoiceId =
            await getInvoiceIdFromPaymentIntent(paymentIntentId);
          if (!invoiceId) {
            return Response.json(
              { error: 'Invoice not found for this order' },
              { status: 404 },
            );
          }

          const invoiceUrl =
            action === 'download'
              ? await getStripeInvoicePdfUrl(invoiceId)
              : await getStripeInvoiceUrl(invoiceId);

          return Response.redirect(invoiceUrl, 302);
        } catch (error) {
          console.error('Error getting invoice URL:', error);
          return Response.json(
            { error: 'Failed to get invoice URL' },
            { status: 500 },
          );
        }
      },
    },
  },
});
