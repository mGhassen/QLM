import { createFileRoute } from '@tanstack/react-router';

import { handleUploadDocAsset } from '@qlm/docs-studio/server';

export const Route = createFileRoute('/api/docs/$slug/upload')({
  server: {
    handlers: {
      POST: ({ request, params }) => handleUploadDocAsset(request, params.slug),
    },
  },
});
