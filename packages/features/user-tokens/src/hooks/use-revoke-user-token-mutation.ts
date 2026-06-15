import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import type { UserToken } from '@guepard/domain/entities';

import { useUserTokensApi } from './user-tokens-api-context';
import { USER_TOKENS_LIST_QUERY_KEY } from './use-user-tokens-query';

/**
 * Soft-revoke a user token. Resolves with the updated row so the caller
 * can show "revoked just now" feedback without a re-fetch round-trip.
 * Invalidates the list query on success so the table reflects the new
 * `revoked = true` state.
 */
export function useRevokeUserTokenMutation(): UseMutationResult<
  UserToken,
  Error,
  { id: string }
> {
  const api = useUserTokensApi();
  const queryClient = useQueryClient();
  return useMutation<UserToken, Error, { id: string }>({
    mutationFn: ({ id }) => api.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USER_TOKENS_LIST_QUERY_KEY,
      });
    },
  });
}
