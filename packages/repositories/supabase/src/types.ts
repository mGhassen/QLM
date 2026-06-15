import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

export type SupabaseClientType = SupabaseClient<Database>;
