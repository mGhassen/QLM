/** Barrel for environments feature UI (lives under `components/`). */

export { EnvironmentsCanvasBottomBar } from "./environments-canvas-bottom-bar";
export { EnvironmentsCanvasLayoutTopBar } from "./environments-canvas-layout-top-bar";
export { EnvironmentsCanvasDotGrid } from "./environments-canvas-dot-grid";
export {
  EnvironmentsEnvironmentList,
  filterServicesByDeploymentEnvironment,
  serviceDeploymentEnvironmentKey,
} from "./environments-environment-list";
export type {
  DeploymentListGroupBy,
  DeploymentListSelection,
} from "./environments-environment-list";
export type { CanvasCardLayoutMode } from "./canvas-card-layout";
export {
  defaultCanvasFreePosition,
  EnvironmentsServicesCanvas,
  type EnvironmentsCanvasCardRole,
  type EnvironmentsCanvasCloneWorkspace,
} from "./environments-services-canvas";
export { CloneCard } from "./clone-card";
export { CmdKPalette, type AddServicePayload, type Screen } from "./cmdk-palette";
export { EnvironmentsListMock } from "./environments-list-mock";
export { EnvironmentsWorkspaceNavbar } from "./environments-workspace-navbar";
export {
  ServiceCard,
  type Service,
  type ServiceStatus,
  type ServiceType,
} from "./service-card";
export {
  ServiceRightPanel,
  SERVICE_RIGHT_PANEL_WIDTH_PX,
  type ServiceRightPanelChromeVariant,
} from "./service-right-panel";
export { EnvironmentCanvasServiceDock } from "./environment-canvas-service-dock";
export { ServiceTopologyServiceDock } from "./service-topology-service-dock";
export { ServiceTreeView } from "./service-tree-view";
export {
  DEFAULT_CANVAS_SERVICES,
  EnvironmentsWorkspaceMock,
  type EnvironmentsWorkspaceMockProps,
} from "./environments-workspace-mock";
