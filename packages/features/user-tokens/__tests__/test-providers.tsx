import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { UserTokensApiProvider, type UserTokensApi } from '../src/hooks';
import { storybookI18n } from '../src/components/story-helpers';

/**
 * Shared wrapper for hook + component tests. Wraps in `QueryClientProvider`,
 * the user-tokens API context, AND the i18n instance so component tests
 * can assert on the resolved English copy.
 */
export function createTestProviders(api: UserTokensApi): {
  wrapper: (props: { children: ReactNode }) => JSX.Element;
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={storybookI18n}>
          <UserTokensApiProvider value={api}>{children}</UserTokensApiProvider>
        </I18nextProvider>
      </QueryClientProvider>
    );
  }
  return { wrapper, queryClient };
}
