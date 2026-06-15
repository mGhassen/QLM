import React from 'react';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';

export function ReactQueryProvider(
  props: React.PropsWithChildren<{ queryClient: QueryClient }>,
) {
  return (
    <QueryClientProvider client={props.queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
