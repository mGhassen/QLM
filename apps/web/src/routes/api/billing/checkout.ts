import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { DomainException } from '@qlm/domain/exceptions';
import {
  GetOrganizationBySlugService,
  GetOrganizationService,
} from '@qlm/domain/services';
import { getSupabaseServerClient } from '@qlm/supabase/server-client';

import { OrganizationCheckoutSchema } from '@/lib/billing/org-billing.schema';
import { createOrganizationBillingService } from '@/lib/billing/org-billing.server';
import { createServerRepositories } from '@/lib/repositories-factory.server';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

const BodySchema = z.object({
  intent: z.enum([
    'account-checkout',
    'account-setup-intent',
    'account-payment-intent',
  ]),
  payload: OrganizationCheckoutSchema.extend({
    amount: z.number().optional(),
  }),
});

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe checkout session, setup intent, or payment intent,
 * depending on the `intent` in the body. Mirrors qwery's billing checkout
 * route.
 */
export const Route = createFileRoute('/api/billing/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof BodySchema>;
        try {
          const json = await request.json();
          parsed = BodySchema.parse(json);
        } catch (error) {
          console.error('Invalid checkout body:', error);
          return Response.json(
            { error: 'Invalid request body' },
            { status: 400 },
          );
        }

        try {
          const { client: serverClient } = getSupabaseServerClient(request);

          // Authenticate via the Supabase session cookie. This is the real
          // auth boundary — CSRF tokens would be redundant here and the rest
          // of the app's API routes don't use them.
          const {
            data: { user: authUser },
            error: authError,
          } = await serverClient.auth.getUser();
          if (authError || !authUser) {
            return Response.json(
              { error: 'Authentication required' },
              { status: 401 },
            );
          }
          const repositories = createServerRepositories(request);
          const service = createOrganizationBillingService(repositories);

          switch (parsed.intent) {
            case 'account-checkout': {
              const result = await service.createCheckout(parsed.payload);
              return Response.json(result);
            }

            case 'account-setup-intent': {
              const result = await service.createSetupIntent(parsed.payload);
              return Response.json(result);
            }

            case 'account-payment-intent': {
              if (!parsed.payload.amount) {
                return Response.json(
                  { error: 'Amount is required' },
                  { status: 400 },
                );
              }

              if (!parsed.payload.organizationId) {
                return Response.json(
                  { error: 'Organization ID is required' },
                  { status: 400 },
                );
              }

              if (!authUser.email) {
                return Response.json(
                  { error: 'Authenticated user must have an email' },
                  { status: 401 },
                );
              }

              try {
                const organizationIdentifier = parsed.payload.organizationId;
                const getOrganizationUseCase = isUUID(organizationIdentifier)
                  ? new GetOrganizationService(repositories.organization)
                  : new GetOrganizationBySlugService(repositories.organization);

                const organizationOutput = await getOrganizationUseCase.execute(
                  organizationIdentifier,
                );

                const result = await service.createPaymentIntent({
                  ...parsed.payload,
                  organizationId: organizationOutput.id,
                  amount: parsed.payload.amount,
                  customerEmail: authUser.email,
                });

                return Response.json(result);
              } catch (error) {
                if (error instanceof DomainException) {
                  return Response.json(
                    { error: error.message },
                    { status: 404 },
                  );
                }
                console.error('Error in payment intent creation:', error);
                throw error;
              }
            }
          }
        } catch (error) {
          console.error('Checkout error:', error);
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to create checkout';
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
