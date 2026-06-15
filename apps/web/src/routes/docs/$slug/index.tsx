import { createFileRoute } from '@tanstack/react-router';

import { DocsPreviewPage } from '@qlm/docs-studio/pages';

export const Route = createFileRoute('/docs/$slug/')({
  head: ({ params }) => ({
    meta: [
      { title: params.slug },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: PreviewRoute,
});

function PreviewRoute() {
  const { slug } = Route.useParams();
  return <DocsPreviewPage slug={slug} />;
}
