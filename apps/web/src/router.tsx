import { createRouter } from '@tanstack/react-router';
import {
  QueryClient,
  dehydrate,
  hydrate,
  type DehydratedState,
} from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

export interface RouterAppContext {
  queryClient: QueryClient;
}

// TanStack Router's `Serializable` does not match React Query's
// `DehydratedState` (which carries non-serializable internal fields). Cast at
// this single boundary; the value is opaque to the router and is only ever
// consumed by `hydrate` below.
type HydrationPayload = { queryClientState: DehydratedState };
type SerializableHydrationPayload = { queryClientState: string };

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: {
      queryClient,
    },
    dehydrate: (): SerializableHydrationPayload =>
      ({
        queryClientState: dehydrate(queryClient),
      }) as unknown as SerializableHydrationPayload,
    hydrate: (dehydrated: SerializableHydrationPayload) => {
      const { queryClientState } = dehydrated as unknown as HydrationPayload;
      if (queryClientState != null && typeof queryClientState === 'object') {
        hydrate(queryClient, queryClientState);
      }
    },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
