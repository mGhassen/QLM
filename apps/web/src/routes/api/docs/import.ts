import { createFileRoute } from '@tanstack/react-router';

import { handleImportDoc } from '@qlm/docs-studio/server';

export const Route = createFileRoute('/api/docs/import')({
  server: {
    handlers: {
      POST: ({ request }) => handleImportDoc(request),
    },
  },
});
