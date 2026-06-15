import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { startMswIfEnabled } from './lib/msw/browser';

async function bootstrap(): Promise<void> {
  const mswPromise = startMswIfEnabled().catch((err: unknown) => {
    console.error('[msw] failed to start; continuing without mocks', err);
  });
  if (import.meta.env.DEV) {
    await mswPromise;
  }
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  });
}

void bootstrap();
