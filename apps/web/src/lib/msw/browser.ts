import { getMswConfig } from './config';

/**
 * Starts MSW in the browser when `VITE_MSW_ENABLED=1`. Kept as a dynamic
 * import so `msw/browser` is never shipped outside dev. Run
 * `pnpm --filter web exec msw init public/ --save` once to generate
 * `public/mockServiceWorker.js` — the worker script MSW requires.
 */
export async function startMswIfEnabled(): Promise<void> {
  if (typeof window === 'undefined') return;
  const config = getMswConfig();
  if (!config.enabled) return;

  const { setupWorker } = await import('msw/browser');
  const { nodesHandlers } = await import('./handlers/nodes');
  const { poolsHandlers } = await import('./handlers/pools');
  const { replicasHandlers } = await import('./handlers/replicas');
  const { infrastructureHandlers } = await import('./handlers/infrastructure');
  const { databasesHandlers } = await import('./handlers/databases');
  const { performanceProfilesHandlers } =
    await import('./handlers/performance-profiles');
  const worker = setupWorker(
    ...nodesHandlers,
    ...poolsHandlers,
    ...replicasHandlers,
    ...infrastructureHandlers,
    ...databasesHandlers,
    ...performanceProfilesHandlers,
  );
  await worker.start({
    onUnhandledRequest: config.onUnhandledRequest,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
