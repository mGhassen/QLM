import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import type {
  CreateUserTokenInput,
  CreateUserTokenOutput,
} from '@qlm/domain/usecases';

import { useUserTokensApi } from './user-tokens-api-context';
import { USER_TOKENS_LIST_QUERY_KEY } from './use-user-tokens-query';

/**
 * Create a new user token. Resolves with `{ row, rawJwt }` — the only
 * place in the entire app where `rawJwt` is exposed to client code. The
 * Story-011 reveal-once pane consumes this hook directly so the JWT only
 * lives on screen long enough for the user to copy it.
 *
 * Invalidates the list query on success so the table re-renders with the
 * new (non-revealed) row.
 */
export function useCreateUserTokenMutation(): UseMutationResult<
  CreateUserTokenOutput,
  Error,
  CreateUserTokenInput
> {
  const api = useUserTokensApi();
  const queryClient = useQueryClient();
  return useMutation<CreateUserTokenOutput, Error, CreateUserTokenInput>({
    mutationFn: (input) => api.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USER_TOKENS_LIST_QUERY_KEY,
      });
    },
  });
}
