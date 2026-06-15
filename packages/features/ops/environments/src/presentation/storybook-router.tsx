import * as React from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

/** Storybook has no app router; {@link EnvironmentsPluginRoot} uses TanStack Router hooks. */
export function withEnvironmentsRouter(
  Story: React.ComponentType,
): React.ReactElement {
  const storyRef = React.useRef(Story);
  storyRef.current = Story;

  const router = React.useMemo(() => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    });

    const catchAllRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "$",
      component: () => {
        const Current = storyRef.current;
        return <Current />;
      },
    });

    const history = createMemoryHistory({
      initialEntries: ["/environments"],
    });

    return createRouter({
      routeTree: rootRoute.addChildren([catchAllRoute]),
      history,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- story updates via ref; router must stay stable
  }, []);

  return <RouterProvider router={router} />;
}
