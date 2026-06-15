import { createFileRoute } from '@tanstack/react-router';

import { handlePreviewDoc } from '@guepard/docs-studio/server';

export const Route = createFileRoute('/api/docs/$slug/preview')({
  server: {
    handlers: {
      GET: ({ params }) => handlePreviewDoc(params.slug),
    },
  },
});
