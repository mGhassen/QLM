import type { ComponentProps } from "react";

import { ServiceRightPanel } from "./service-right-panel";

/** Docked detail panel in the **service topology** workspace (`/environment/…`). */
export function ServiceTopologyServiceDock(
  props: Omit<ComponentProps<typeof ServiceRightPanel>, "chromeVariant">,
) {
  return <ServiceRightPanel {...props} chromeVariant="service-topology" />;
}
