import { Outlet, createFileRoute, Navigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import pathsConfig from '@/config/paths.config';
import { useProjectShellContextBySlug } from '@/shell/project-shell-host';

export const Route = createFileRoute('/prj/$projectSlug')({
  component: ProjectLayout,
});

/**
 * Pass-through layout for `/prj/$projectSlug/*`. The shell is rendered by
 * child routes (`$routeBase.tsx` for contextual apps, `index.tsx` which
 * redirects to the default app).
 */
function ProjectLayout() {
  const { projectSlug } = Route.useParams();
  const { isProjectLoading, projectNotFound } =
    useProjectShellContextBySlug(projectSlug);

  if (isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (projectNotFound) {
    return <Navigate to={pathsConfig.app.home} replace />;
  }

  return <Outlet />;
}
