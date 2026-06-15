import process from 'node:process';
import { z } from 'zod';

const message =
  'Invalid Supabase Supabase Secret Key. Please add the environment variable SUPABASE_SECRET_KEY.';

/**
 * @name getSupabaseSecretKey
 * @description Get the Supabase Supabase Secret Key.
 * ONLY USE IN SERVER-SIDE CODE. DO NOT EXPOSE THIS TO CLIENT-SIDE CODE.
 */
export function getSupabaseSecretKey() {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined || issue.input === ''
          ? message
          : 'Expected string',
    })
    .min(1, message)
    .parse(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
}

/**
 * Displays a warning message if the Supabase Service Role is being used.
 */
export function warnSupabaseSecretKeyUsage() {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Dev Only] This is a simple warning to let you know you are using the Supabase Secret Key. This key bypasses RLS and should only be used in server-side code. Please make sure it's the intended usage`,
    );
  }
}
