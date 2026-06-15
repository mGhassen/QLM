import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  getBillingEventHandlerService,
  getPlanTypesMap,
} from '@qlm/billing/services';
import { getLogger } from '@qlm/shared/logger';
import type { Database } from '@qlm/supabase/database';

import billingConfig from '@/config/billing.config';

/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events. Uses a service-role Supabase client so it
 * can invoke SECURITY DEFINER functions like `add_credits_to_organization`
 * and `upsert_order`. Signature is verified inside
 * `StripeWebhookHandlerService.verifyWebhookSignature` using
 * `STRIPE_WEBHOOK_SECRET`.
 */
export const Route = createFileRoute('/api/billing/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const logger = await getLogger();
        const ctx = {
          name: 'billing.webhook',
          provider: billingConfig.provider,
        };

        logger.info(ctx, 'Received billing webhook. Processing...');

        const supabaseUrl = z
          .string()
          .min(1)
          .parse(
            import.meta.env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
          );
        const serviceRoleKey = z
          .string()
          .min(1)
          .parse(
            process.env.SUPABASE_SECRET_KEY ??
              process.env.SUPABASE_SERVICE_ROLE_KEY,
          );

        const supabaseClientProvider = () =>
          createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: {
              persistSession: false,
              detectSessionInUrl: false,
              autoRefreshToken: false,
            },
          });

        const service = getBillingEventHandlerService(
          supabaseClientProvider,
          getPlanTypesMap(billingConfig),
        );

        try {
          await service.handleWebhookEvent(request);
          logger.info(ctx, 'Successfully processed billing webhook');
          return new Response('OK', { status: 200 });
        } catch (error) {
          logger.error({ ...ctx, error }, 'Failed to process billing webhook');
          return new Response('Failed to process billing webhook', {
            status: 500,
          });
        }
      },
    },
  },
});
