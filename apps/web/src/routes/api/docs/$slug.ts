import { createFileRoute } from '@tanstack/react-router';

import {
  handleDeleteDoc,
  handleGetDoc,
  handleSaveDoc,
} from '@guepard/docs-studio/server';

export const Route = createFileRoute('/api/docs/$slug')({
  server: {
    handlers: {
      GET: ({ request, params }) => handleGetDoc(request, params.slug),
      PUT: ({ request, params }) => handleSaveDoc(request, params.slug),
      DELETE: ({ request, params }) => handleDeleteDoc(request, params.slug),
    },
  },
});
