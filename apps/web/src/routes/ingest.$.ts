import { createFileRoute } from '@tanstack/react-router';

import { proxyPosthogIngestRequest } from '@/lib/posthog-ingest-proxy.server';

export const Route = createFileRoute('/ingest/$')({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        proxyPosthogIngestRequest(request, params._splat, {
          mountPrefix: '/ingest',
        }),
      POST: ({ request, params }) =>
        proxyPosthogIngestRequest(request, params._splat, {
          mountPrefix: '/ingest',
        }),
      PUT: ({ request, params }) =>
        proxyPosthogIngestRequest(request, params._splat, {
          mountPrefix: '/ingest',
        }),
      PATCH: ({ request, params }) =>
        proxyPosthogIngestRequest(request, params._splat, {
          mountPrefix: '/ingest',
        }),
      DELETE: ({ request, params }) =>
        proxyPosthogIngestRequest(request, params._splat, {
          mountPrefix: '/ingest',
        }),
    },
  },
});
