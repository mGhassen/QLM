import type { ComponentProps } from "react";

import { ServiceRightPanel } from "./service-right-panel";

/** Docked detail panel on the **environment** canvas (`/environments/…`). */
export function EnvironmentCanvasServiceDock(
  props: Omit<ComponentProps<typeof ServiceRightPanel>, "chromeVariant">,
) {
  return <ServiceRightPanel {...props} chromeVariant="environment-canvas" />;
}
