import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export type CreateBillingCheckoutParams = {
  organizationId: string;
  orgSlug: string;
  csrfToken: string;
};

/**
 * Mutation hook that POSTs to `/api/billing/checkout` with
 * `intent: 'account-payment-intent'` and returns the Stripe client secret
 * (`checkoutToken`) for the `BuyCredits` PaymentElement.
 */
export function useCreateBillingCheckout(
  params: CreateBillingCheckoutParams | null,
  options?: {
    onError?: (error: Error) => void;
  },
) {
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!params?.organizationId || !params?.orgSlug) {
        throw new Error('Organization not found');
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'account-payment-intent',
          payload: {
            organizationId: params.organizationId,
            slug: params.orgSlug,
            csrfToken: params.csrfToken,
            amount,
          },
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to create payment intent' }));
        throw new Error(error.error || 'Failed to create payment intent');
      }

      return (await response.json()) as { checkoutToken: string };
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create payment intent';
      toast.error(message);
      options?.onError?.(error instanceof Error ? error : new Error(message));
    },
  });
}
