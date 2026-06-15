import { createStripeClient } from './stripe-sdk';

/**
 * Creates a Stripe invoice from a successful payment intent
 * Note: Stripe doesn't allow retroactive invoice creation, so we create
 * invoice items and invoice, then mark as paid out-of-band
 */
export async function createInvoiceFromPaymentIntent(
  paymentIntentId: string,
  customerId: string,
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, string>,
): Promise<string> {
  const stripe = await createStripeClient();

  // Create invoice item for the credit purchase (without invoice - it will be pending)
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: amount,
    currency: currency,
    description: description,
    metadata: {
      ...metadata,
      payment_intent_id: paymentIntentId,
    },
  });

  // Create invoice - it will automatically include pending invoice items
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'charge_automatically',
    auto_advance: false, // Don't auto-finalize, we'll do it manually
    pending_invoice_items_behavior: 'include', // Include pending invoice items
    metadata: {
      ...metadata,
      payment_intent_id: paymentIntentId,
      source: 'payment_intent',
    },
  });

  // Finalize the invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    expand: ['payment_intent'],
  });

  // Mark as paid out-of-band (since payment already succeeded via payment intent)
  await stripe.invoices.pay(finalizedInvoice.id, {
    paid_out_of_band: true,
  });

  return finalizedInvoice.id;
}
