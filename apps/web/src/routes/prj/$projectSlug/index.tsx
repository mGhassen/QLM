import { createFileRoute, Navigate } from '@tanstack/react-router';

import { getAppRegistry } from '@/shell/app-registry';
import { createProjectAppPath } from '@/config/paths.config';

export const Route = createFileRoute('/prj/$projectSlug/')({
  component: ProjectIndexPage,
});

function ProjectIndexPage() {
  const { projectSlug } = Route.useParams();
  const defaultRouteBase = getAppRegistry().getDefaultRouteBase();
  return (
    <Navigate
      to={createProjectAppPath(projectSlug, defaultRouteBase)}
      replace
    />
  );
}
