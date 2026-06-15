import { createClient } from '@supabase/supabase-js';

import { Database } from '../database.types';
import {
  getSupabaseSecretKey,
  warnSupabaseSecretKeyUsage,
} from '../get-service-role-key';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

const supabaseSecretKey = getSupabaseSecretKey();
const keys = getSupabaseClientKeys();

/**
 * @name getSupabaseServerClient
 * @description Get a Supabase client for use in server-side functions as an admin.
 */
export function getSupabaseServerAdminClient<GenericSchema = Database>() {
  warnSupabaseSecretKeyUsage();

  return createClient<GenericSchema>(keys.url, supabaseSecretKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}
