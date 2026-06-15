import { createFileRoute } from '@tanstack/react-router';

import {
  handleCreateDoc,
  handleListDocs,
} from '@guepard/docs-studio/server';

export const Route = createFileRoute('/api/docs/')({
  server: {
    handlers: {
      GET: ({ request }) => handleListDocs(request),
      POST: ({ request }) => handleCreateDoc(request),
    },
  },
});
