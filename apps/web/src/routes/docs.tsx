import { createFileRoute, Outlet } from '@tanstack/react-router';

import { DocsLayout } from '@guepard/docs-studio/pages';

export const Route = createFileRoute('/docs')({
  component: DocsRouteLayout,
});

function DocsRouteLayout() {
  return (
    <DocsLayout>
      <Outlet />
    </DocsLayout>
  );
}
