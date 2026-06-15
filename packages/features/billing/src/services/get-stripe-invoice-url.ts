import type Stripe from 'stripe';
import { createStripeClient } from './stripe-sdk';

/**
 * Get Stripe invoice URL for viewing
 * @param invoiceId - Stripe invoice ID (e.g., "in_1234...")
 * @returns The hosted invoice URL
 */
export async function getStripeInvoiceUrl(invoiceId: string): Promise<string> {
  const stripe = await createStripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);

  // Stripe provides a hosted_invoice_url for viewing
  if (invoice.hosted_invoice_url) {
    return invoice.hosted_invoice_url;
  }

  // Fallback: construct the URL manually
  // Format: https://invoice.stripe.com/i/{invoice_id}
  return `https://invoice.stripe.com/i/${invoiceId}`;
}

/**
 * Get Stripe invoice PDF download URL
 * @param invoiceId - Stripe invoice ID (e.g., "in_1234...")
 * @returns The PDF download URL
 */
export async function getStripeInvoicePdfUrl(
  invoiceId: string,
): Promise<string> {
  const stripe = await createStripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);

  // Stripe provides invoice_pdf for downloading
  if (invoice.invoice_pdf) {
    return invoice.invoice_pdf;
  }

  // Fallback: construct the URL manually
  // Format: https://pay.stripe.com/invoice/{invoice_id}/pdf
  return `https://pay.stripe.com/invoice/${invoiceId}/pdf`;
}

/**
 * Get Stripe invoice ID from payment intent ID
 * @param paymentIntentId - Stripe payment intent ID (e.g., "pi_1234...")
 * @returns The invoice ID if found, null otherwise
 */
export async function getInvoiceIdFromPaymentIntent(
  paymentIntentId: string,
): Promise<string | null> {
  const stripe = await createStripeClient();

  // Search for invoices with this payment intent in metadata
  const invoices = await stripe.invoices.search({
    query: `metadata['payment_intent_id']:'${paymentIntentId}'`,
    limit: 1,
  });

  if (invoices.data.length > 0 && invoices.data[0]) {
    return invoices.data[0].id;
  }

  // Alternative: retrieve payment intent and check if it has an invoice
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {
        expand: ['invoice'],
      },
    );
    // Payment intent can have invoice as a string ID or an expanded Invoice object
    const invoice = (
      paymentIntent as Stripe.PaymentIntent & {
        invoice?: string | Stripe.Invoice | null;
      }
    ).invoice;
    if (typeof invoice === 'string') {
      return invoice;
    }
    if (invoice && typeof invoice === 'object' && 'id' in invoice) {
      return invoice.id;
    }
  } catch {
    // Payment intent might not exist
  }

  return null;
}
