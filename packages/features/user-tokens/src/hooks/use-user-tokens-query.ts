import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { UserToken } from '@qlm/domain/entities';

import { useUserTokensApi } from './user-tokens-api-context';

/**
 * Stable query key shared by the list query AND the two mutations'
 * post-success invalidations. Exporting it avoids string-key drift across
 * files.
 */
export const USER_TOKENS_LIST_QUERY_KEY = ['user-tokens', 'list'] as const;

/**
 * Fetch all tokens owned by the current account. Account scoping is
 * enforced by the server from the session — the browser never sees other
 * accounts' rows.
 */
export function useUserTokensQuery(): UseQueryResult<UserToken[]> {
  const api = useUserTokensApi();
  return useQuery<UserToken[]>({
    queryKey: USER_TOKENS_LIST_QUERY_KEY,
    queryFn: () => api.list(),
  });
}
