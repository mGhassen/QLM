import { SupabaseClient } from '@supabase/supabase-js';
import { createBillingEventHandlerService } from './billing-event-handler.service';
import { Database } from '@guepard/supabase/database';
import { PlanTypeMap } from '../types/create-billing-schema';

export * from './create-stripe-checkout';
export * from './create-setup-intent';
export * from './create-payment-intent';
export * from './create-invoice-from-payment-intent';
export * from './get-stripe-invoice-url';
export * from './update-payment-intent';
export * from './calculate-credits.service';
export * from './consume-credits.service';
export * from './allocate-credits.service';
export * from './stripe-webhook-handler.service';
export * from './billing-event-handler.service';
export * from '../types/create-billing-schema';

export const getBillingEventHandlerService = (
  clientProvider: () => SupabaseClient<Database>,
  planTypesMap: PlanTypeMap,
) => {
  return createBillingEventHandlerService(clientProvider, planTypesMap);
};
