import React from "react";
import { inferEnvironmentsWorkspaceUrlSegment } from "../navigation-path";
import { useEnvironmentUrlNavigation } from "./use-environment-url-navigation";
import type { EnvironmentUrlNavigateMeta } from "./use-environment-url-navigation";
import { useRouterState } from "@tanstack/react-router";
import {
  EnvironmentsWorkspaceMock,
  EnvironmentsCanvasBottomBar,
  EnvironmentsCanvasDotGrid,
  EnvironmentsCanvasLayoutTopBar,
  EnvironmentsServicesCanvas,
  CmdKPalette,
  ServiceCard,
  ServiceRightPanel,
  ServiceTreeView,
} from "./components";

void [
  EnvironmentsCanvasBottomBar,
  EnvironmentsCanvasDotGrid,
  EnvironmentsCanvasLayoutTopBar,
  EnvironmentsServicesCanvas,
  CmdKPalette,
  ServiceCard,
  ServiceRightPanel,
  ServiceTreeView,
];

export function EnvironmentsPluginRoot() {
  const { urlPathTail, onUrlPathTailChange } = useEnvironmentUrlNavigation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const workspaceUrlSegment = inferEnvironmentsWorkspaceUrlSegment(pathname);

  // Deep URL navigation (non-empty tail) requires a splat route under /$routeBase/$
  // which doesn't exist. Only allow empty-tail navigation (environment switching).
  const handleUrlPathTailChange = React.useCallback(
    (tail: string, meta?: EnvironmentUrlNavigateMeta) => {
      if (tail.trim() !== "") return;
      onUrlPathTailChange(tail, meta);
    },
    [onUrlPathTailChange],
  );

  return (
    <div className="bg-background flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <EnvironmentsWorkspaceMock
        className="min-h-0 flex-1"
        enableEnvironmentServiceCanvas
        urlPathTail={urlPathTail}
        onUrlPathTailChange={handleUrlPathTailChange}
        workspaceUrlSegment={workspaceUrlSegment}
      />
    </div>
  );
}
