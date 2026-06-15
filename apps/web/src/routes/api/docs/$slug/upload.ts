import { createFileRoute } from '@tanstack/react-router';

import { handleUploadDocAsset } from '@guepard/docs-studio/server';

export const Route = createFileRoute('/api/docs/$slug/upload')({
  server: {
    handlers: {
      POST: ({ request, params }) => handleUploadDocAsset(request, params.slug),
    },
  },
});
