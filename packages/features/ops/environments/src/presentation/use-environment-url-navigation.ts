import { useCallback, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  environmentsPluginPathTail,
  inferEnvironmentsWorkspaceUrlSegment,
} from "../navigation-path";
import type { EnvironmentUrlNavigateMeta } from "../navigation-path";

export type { EnvironmentUrlNavigateMeta } from "../navigation-path";

/**
 * Drives `/environments/…` (canvas) vs `/environment/…` (service workspace) + tail from the
 * workspace pathname, or from `restPath` in {@link EnvironmentsProjectDeepOutlet}.
 */
export function useEnvironmentUrlNavigation(restPathFromDeepOutlet?: string) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const urlPathTail = useMemo(() => {
    if (restPathFromDeepOutlet !== undefined) return restPathFromDeepOutlet;
    return environmentsPluginPathTail(pathname);
  }, [pathname, restPathFromDeepOutlet]);

  const onUrlPathTailChange = useCallback(
    (nextTail: string, meta?: EnvironmentUrlNavigateMeta) => {
      const trimmed = nextTail.trim();
      const segment =
        meta?.urlSegment ?? inferEnvironmentsWorkspaceUrlSegment(pathname);
      if (trimmed === "") {
        void navigate({
          to: "/$routeBase",
          params: { routeBase: segment },
        });
      } else {
        void navigate({
          to: "/$routeBase/$",
          params: { routeBase: segment, _splat: trimmed },
        });
      }
    },
    [navigate, pathname],
  );

  return { urlPathTail, onUrlPathTailChange };
}
