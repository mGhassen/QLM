import { JwtPayload } from '@supabase/supabase-js';

import { useQuery } from '@tanstack/react-query';

import { requireUser } from '../require-user';
import { useSupabase } from './use-supabase';

export const USER_QUERY_KEY = ['supabase:user'] as const;

export function useUser(initialData?: JwtPayload | null) {
  const client = useSupabase();

  const queryFn = async () => {
    const response = await requireUser(client);

    if (response.error) {
      return null;
    }

    return response.data;
  };

  return useQuery({
    queryFn,
    queryKey: USER_QUERY_KEY,
    initialData,
    refetchInterval: false,
    // Must refetch when entering protected routes; otherwise a cached `null`
    // from a prior visit sticks and the user is sent back to sign-in after login.
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}
