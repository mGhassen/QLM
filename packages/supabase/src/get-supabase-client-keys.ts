import { z } from 'zod';

/**
 * Returns and validates the Supabase client keys from the environment.
 */
export function getSupabaseClientKeys() {
  return z
    .object({
      url: z.string().min(1),
      publicKey: z.string().min(1),
    })
    .parse({
      url: import.meta.env.VITE_SUPABASE_URL,
      publicKey:
        import.meta.env.VITE_SUPABASE_PUBLIC_KEY ??
        import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
}
