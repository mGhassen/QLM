import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@qlm/supabase/database';

export type SupabaseClientType = SupabaseClient<Database>;
