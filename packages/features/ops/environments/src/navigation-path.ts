/** Both canvas and service topology views use the same URL segment matching the registered routeBase. */
export const ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT = "environment" as const;
export const ENVIRONMENTS_WORKSPACE_SERVICE_URL_SEGMENT = "environment" as const;

export type EnvironmentsWorkspaceUrlSegment =
  | typeof ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT
  | typeof ENVIRONMENTS_WORKSPACE_SERVICE_URL_SEGMENT;

export type EnvironmentUrlNavigateMeta = {
  urlSegment?: EnvironmentsWorkspaceUrlSegment;
};

/** Path after `/{routeBase}/` (no leading slash; empty at plugin root). Works with both root-level and project-scoped paths. */
export function workspacePluginPathTail(pathname: string, routeBase: string): string {
  const n = pathname.replace(/\/+$/, "") || "/";
  const markerWithSlash = `/${routeBase}/`;
  const markerEnd = `/${routeBase}`;
  const idx = n.indexOf(markerWithSlash);
  if (idx !== -1) return n.slice(idx + markerWithSlash.length);
  if (n.endsWith(markerEnd)) return "";
  return "";
}

export function inferEnvironmentsWorkspaceUrlSegment(
  _pathname: string,
): EnvironmentsWorkspaceUrlSegment {
  return ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT;
}

/** Path tail for `/environments/…` or `/environment/…` (or project-scoped equivalents). */
export function environmentsPluginPathTail(pathname: string): string {
  return workspacePluginPathTail(pathname, inferEnvironmentsWorkspaceUrlSegment(pathname));
}
