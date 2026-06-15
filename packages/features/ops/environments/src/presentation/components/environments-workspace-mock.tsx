import * as React from "react";
import { AnimatePresence } from "framer-motion";

import { cn } from "@qlm/ui/utils";

import {
  CmdKPalette,
  type AddServicePayload,
  type Screen,
} from "./cmdk-palette";
import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import {
  defaultCanvasFreePosition,
  EnvironmentsServicesCanvas,
} from "./environments-services-canvas";
import {
  filterServicesByDeploymentEnvironment,
  serviceDeploymentEnvironmentKey,
  type DeploymentListGroupBy,
  type DeploymentListSelection,
} from "./environments-environment-list";
import {
  buildEnvironmentUrlPath,
  parseEnvironmentUrlPath,
  type ServiceRightPanelUrlTab,
} from "../../environment-url-path";
import {
  ensureListUrlIds,
  lookupUrlResource,
  nextAvailableUrlId,
} from "../../environment-url-registry";
import {
  ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT,
  ENVIRONMENTS_WORKSPACE_SERVICE_URL_SEGMENT,
  type EnvironmentUrlNavigateMeta,
  type EnvironmentsWorkspaceUrlSegment,
} from "../../navigation-path";
import type { Service, ServiceType } from "./service-card";
import { EnvironmentCanvasServiceDock } from "./environment-canvas-service-dock";
import {
  ServiceRightPanel,
  SERVICE_RIGHT_PANEL_WIDTH_PX,
} from "./service-right-panel";
import { ServiceTopologyServiceDock } from "./service-topology-service-dock";
import { ServiceTreeView } from "./service-tree-view";

function syntheticClonePanelService(parent: Service, cloneName: string): Service {
  return {
    ...parent,
    id: `${parent.id}__clone-panel`,
    name: cloneName,
    cloneUrlIds: undefined,
  };
}

/** Default services on the environment canvas (clones → topology; no clones → right panel). */
export const DEFAULT_CANVAS_SERVICES: Service[] = [
  {
    id: "svc-pg",
    name: "postgres-primary",
    type: "postgres",
    status: "online",
    urlId: 1,
    cloneUrlIds: [323, 324, 328, 329, 330],
    environmentName: "Production",
    databaseProviderName: "Neon",
    databaseProviderLogoUrl: "https://cdn.simpleicons.org/neon/00e5bf",
    databaseVersion: "16.4",
    nodeName: "db-prd-use1a-01",
    nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/amazonaws/ff9900",
  },
  {
    id: "svc-rd",
    name: "redis-cache",
    type: "redis",
    status: "online",
    urlId: 2,
    environmentName: "Production",
    databaseProviderName: "Upstash",
    databaseProviderLogoUrl: "https://cdn.simpleicons.org/upstash/00e9a3",
    databaseVersion: "7.2",
    nodeName: "cache-edge-ewr",
    nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/cloudflare/f38020",
  },
  {
    id: "svc-mg",
    name: "mongo-docs",
    type: "mongo",
    status: "offline",
    urlId: 3,
    environmentName: "Staging",
    databaseProviderName: "MongoDB Atlas",
    databaseProviderLogoUrl: "https://cdn.simpleicons.org/mongodb/47a248",
    databaseVersion: "7.0",
    nodeName: "doc-stg-euc1-02",
    nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/googlecloud/4285f4",
  },
  {
    id: "svc-ext",
    name: "warehouse-snowflake",
    type: "external_datasource",
    status: "online",
    urlId: 4,
    cloneUrlIds: [326],
    environmentName: "Production",
    databaseProviderName: "Snowflake",
    databaseProviderLogoUrl: "https://cdn.simpleicons.org/snowflake/29b5e8",
    databaseVersion: "8.32",
    nodeName: "connector-use1-01",
    nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/amazonaws/ff9900",
    externalDatasource: { syncEnabled: true },
  },
  {
    id: "svc-ext-static",
    name: "legal-drive-export",
    type: "external_datasource",
    status: "deploying",
    urlId: 5,
    cloneUrlIds: [327],
    environmentName: "Production",
    databaseProviderName: "Google Drive",
    databaseProviderLogoUrl: "https://cdn.simpleicons.org/googledrive/4285f4",
    databaseVersion: "—",
    nodeName: "connector-use1-02",
    nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/googlecloud/4285f4",
    externalDatasource: { syncEnabled: false },
  },
];

const DEFAULT_ENVIRONMENTS = ["production", "staging", "development"];

const urlNavigateCanvas: EnvironmentUrlNavigateMeta = {
  urlSegment: ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT,
};
const urlNavigateService: EnvironmentUrlNavigateMeta = {
  urlSegment: ENVIRONMENTS_WORKSPACE_SERVICE_URL_SEGMENT,
};

function resolveCanvasServices(services?: Service[], single?: Service): Service[] {
  if (services?.length) return services;
  if (single) return [single];
  return DEFAULT_CANVAS_SERVICES;
}

function newServiceId() {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return `svc-${globalThis.crypto.randomUUID()}`;
  }
  return `svc-${Date.now()}`;
}

function environmentDisplayNameFromKey(key: string): string | undefined {
  if (key === "unassigned") return undefined;
  return key
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/** Re-applies a reordered subset (e.g. canvas drag) onto the full service list. */
function mergeReorderedSubset(full: Service[], subset: Service[]): Service[] {
  const sliceIds = new Set(subset.map((s) => s.id));
  const firstSliceIdx = full.findIndex((s) => sliceIds.has(s.id));
  if (firstSliceIdx < 0) return full;
  const without = full.filter((s) => !sliceIds.has(s.id));
  const prefixCount = full
    .slice(0, firstSliceIdx)
    .filter((s) => !sliceIds.has(s.id)).length;
  return [...without.slice(0, prefixCount), ...subset, ...without.slice(prefixCount)];
}

export type EnvironmentsWorkspaceMockProps = {
  /** Services shown on the canvas; omit → {@link DEFAULT_CANVAS_SERVICES}. */
  services?: Service[];
  /** Single-service canvas (legacy); ignored when `services` is set. */
  service?: Service;
  environments?: string[];
  className?: string;
/**
 * When `true` (default), services with `cloneUrlIds` open {@link ServiceTreeView}; others open
 * {@link ServiceRightPanel}. The Layers control only appears when clones exist.
 * When `false`, the same routing applies beside the legacy split layout.
 */
  enableEnvironmentServiceCanvas?: boolean;
  /** Path tail under the environments plugin base (e.g. `1`, `1/overview`). */
  urlPathTail?: string;
  /** When set with {@link urlPathTail}, selection and optional panel tab follow the URL. */
  onUrlPathTailChange?: (tail: string, meta?: EnvironmentUrlNavigateMeta) => void;
  /**
   * Which URL prefix the host is on (`/environments/…` vs `/environment/…`). Drives dock close
   * behavior; defaults to canvas when omitted (e.g. Storybook).
   */
  workspaceUrlSegment?: EnvironmentsWorkspaceUrlSegment;
};

/**
 * Environments workspace mock: service grid with zoom bar + CmdK; opening a card either drills into
 * {@link ServiceTreeView} or docks canvas/topology docks (see `enableEnvironmentServiceCanvas`).
 */
export function EnvironmentsWorkspaceMock({
  services,
  service: singleService,
  environments = DEFAULT_ENVIRONMENTS,
  className,
  enableEnvironmentServiceCanvas = true,
  urlPathTail = "",
  onUrlPathTailChange,
  workspaceUrlSegment = ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT,
}: EnvironmentsWorkspaceMockProps) {
  const urlMode = onUrlPathTailChange != null;

  const [servicesList, setServicesList] = React.useState<Service[]>(() =>
    ensureListUrlIds(resolveCanvasServices(services, singleService).map((s) => ({ ...s }))),
  );

  const [cardLayoutMode, setCardLayoutMode] = React.useState<CanvasCardLayoutMode>("grid");

  const handleCardLayoutModeChange = React.useCallback((mode: CanvasCardLayoutMode) => {
    setCardLayoutMode(mode);
    if (mode === "free") {
      setServicesList((prev) =>
        prev.map((s, i) => {
          if (s.x != null && s.y != null) return s;
          return { ...s, ...defaultCanvasFreePosition(i, prev.length) };
        }),
      );
    }
  }, []);

  const [activeEnvironment, setActiveEnvironment] = React.useState(
    () => environments[0] ?? "production",
  );
  const [listGroupBy, setListGroupBy] = React.useState<DeploymentListGroupBy>("none");
  const [showEnvironmentList, setShowEnvironmentList] = React.useState(false);
  const [canvasFocusServiceId, setCanvasFocusServiceId] = React.useState<string | null>(null);
  const keepPanelOnActiveEnvironmentChange = React.useRef(false);
  const [treeService, setTreeService] = React.useState<Service | null>(null);
  const [panelService, setPanelService] = React.useState<Service | null>(null);
  const [topologyForestFlat, setTopologyForestFlat] = React.useState<Service[]>([]);

  const handleCloneForestChange = React.useCallback((rows: Service[]) => {
    setTopologyForestFlat(rows);
  }, []);

  const { urlId: parsedUrlId, panelTab: urlPanelTab } = React.useMemo(
    () => parseEnvironmentUrlPath(urlPathTail ?? ""),
    [urlPathTail],
  );
  const urlLookup = React.useMemo(
    () =>
      parsedUrlId != null
        ? lookupUrlResource(servicesList, parsedUrlId, topologyForestFlat)
        : null,
    [parsedUrlId, servicesList, topologyForestFlat],
  );

  const urlCloneParent = urlLookup?.kind === "clone" ? urlLookup.parent : null;
  const effectiveTreeService = urlCloneParent ?? treeService;

  React.useLayoutEffect(() => {
    if (!urlMode) return;
    if (workspaceUrlSegment === ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT) {
      setTreeService(null);
      return;
    }
    if (urlLookup?.kind === "service") {
      setTreeService((prev) =>
        prev?.id === urlLookup.service.id ? prev : urlLookup.service,
      );
      setPanelService(null);
      return;
    }
    setTreeService(null);
  }, [urlMode, workspaceUrlSegment, urlLookup]);

  React.useEffect(() => {
    setTopologyForestFlat([]);
  }, [effectiveTreeService?.id]);

  const dockedPanelService = React.useMemo(() => {
    if (effectiveTreeService) {
      if (urlLookup?.kind === "clone") {
        if (!urlMode) {
          return syntheticClonePanelService(urlLookup.parent, urlLookup.name);
        }
        return urlPanelTab != null
          ? syntheticClonePanelService(urlLookup.parent, urlLookup.name)
          : null;
      }
      if (
        urlMode &&
        urlLookup?.kind === "service" &&
        urlPanelTab != null &&
        effectiveTreeService.id === urlLookup.service.id
      ) {
        return urlLookup.service;
      }
      return null;
    }
    if (urlMode) {
      if (urlLookup?.kind === "service") {
        return urlPanelTab != null ? urlLookup.service : null;
      }
      // No URL lookup — fall back to React state (deep URLs require splat route)
      return panelService;
    }
    return panelService;
  }, [
    effectiveTreeService,
    panelService,
    urlLookup,
    urlMode,
    urlPanelTab,
  ]);

  const panelSubtitle = React.useMemo(() => {
    if (urlLookup?.kind === "clone") {
      return `Replica · ${urlLookup.parent.name}`;
    }
    return null;
  }, [urlLookup]);

  const servicePanelUrlProps = React.useMemo(() => {
    if (
      !urlMode ||
      parsedUrlId == null ||
      !onUrlPathTailChange ||
      urlPanelTab == null
    ) {
      return null;
    }
    return {
      activePanelTab: urlPanelTab,
      onPanelTabChange: (tab: ServiceRightPanelUrlTab) =>
        onUrlPathTailChange(buildEnvironmentUrlPath(parsedUrlId, tab)),
    };
  }, [onUrlPathTailChange, parsedUrlId, urlMode, urlPanelTab]);

  const mainCanvasSelectedId = React.useMemo(() => {
    if (effectiveTreeService) return null;
    if (
      urlMode &&
      urlLookup?.kind === "service" &&
      workspaceUrlSegment === ENVIRONMENTS_WORKSPACE_CANVAS_URL_SEGMENT
    ) {
      return urlLookup.service.id;
    }
    // Fall back to state-selected service (URL deep linking not available)
    if (panelService) return panelService.id;
    return null;
  }, [effectiveTreeService, panelService, urlLookup, urlMode, workspaceUrlSegment]);

  const selectedCloneUrlId =
    urlLookup?.kind === "clone" ? urlLookup.urlId : null;

  const closeDockedPanel = React.useCallback(() => {
    setPanelService(null);
    if (urlMode && onUrlPathTailChange) {
      onUrlPathTailChange("", urlNavigateCanvas);
      setTreeService(null);
    }
  }, [onUrlPathTailChange, urlMode]);

  const dismissCanvasUrlSelection = React.useCallback(() => {
    if (!urlMode || !onUrlPathTailChange) return;
    const { urlId } = parseEnvironmentUrlPath(urlPathTail ?? "");
    if (urlId == null) return;
    onUrlPathTailChange("", urlNavigateCanvas);
  }, [onUrlPathTailChange, urlMode, urlPathTail]);

  const handleToggleEnvironmentList = React.useCallback(() => {
    setShowEnvironmentList((prev) => {
      if (!prev) {
        setPanelService(null);
        setTreeService(null);
        if (urlMode) onUrlPathTailChange?.("", urlNavigateCanvas);
      }
      return !prev;
    });
  }, [onUrlPathTailChange, urlMode]);

  const exitTreeView = React.useCallback(() => {
    if (urlMode) onUrlPathTailChange?.("", urlNavigateCanvas);
    setTreeService(null);
  }, [onUrlPathTailChange, urlMode]);

  const canvasServices = React.useMemo(
    () => filterServicesByDeploymentEnvironment(servicesList, activeEnvironment),
    [servicesList, activeEnvironment],
  );

  const handleInventorySelect = React.useCallback(
    (sel: DeploymentListSelection) => {
      if (sel.kind === "environment") {
        keepPanelOnActiveEnvironmentChange.current = false;
        setActiveEnvironment(sel.key);
        setPanelService(null);
        setTreeService(null);
        setCanvasFocusServiceId(null);
        setShowEnvironmentList(false);
        if (urlMode) onUrlPathTailChange?.("", urlNavigateCanvas);
        return;
      }
      const svc = sel.service;
      const key = serviceDeploymentEnvironmentKey(svc);
      keepPanelOnActiveEnvironmentChange.current = key !== activeEnvironment;
      setActiveEnvironment(key);
      setTreeService(null);
      setPanelService(svc);
      setCanvasFocusServiceId(svc.id);
      setShowEnvironmentList(false);
      if (urlMode && onUrlPathTailChange) {
        if (sel.kind === "clone") {
          const cid = svc.cloneUrlIds?.[sel.cloneIndex];
          if (cid != null) {
            onUrlPathTailChange(
              buildEnvironmentUrlPath(cid, "overview"),
              urlNavigateCanvas,
            );
          }
        } else if (svc.urlId != null) {
          onUrlPathTailChange(
            buildEnvironmentUrlPath(svc.urlId, "overview"),
            urlNavigateCanvas,
          );
        }
      }
    },
    [activeEnvironment, onUrlPathTailChange, urlMode],
  );

  const handleFocusServiceApplied = React.useCallback(() => {
    setCanvasFocusServiceId(null);
  }, []);

  const [cmdkOpen, setCmdkOpen] = React.useState(false);

  /** Card click: toggle right panel. State-driven (deep URL requires splat route). */
  const selectFromCanvas = React.useCallback(
    (s: Service) => {
      setPanelService((prev) => (prev?.id === s.id ? null : s));
    },
    [],
  );

  const openServiceWorkspace = React.useCallback(
    (s: Service) => {
      setTreeService(s);
      setPanelService(null);
    },
    [],
  );
  const [cmdkOpenTo, setCmdkOpenTo] = React.useState<
    { screen: Screen; dbType?: ServiceType } | undefined
  >();

  const prevActiveEnvironmentRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const prev = prevActiveEnvironmentRef.current;
    prevActiveEnvironmentRef.current = activeEnvironment;
    const environmentChangedByUser =
      prev !== null && prev !== activeEnvironment;
    if (!environmentChangedByUser) {
      keepPanelOnActiveEnvironmentChange.current = false;
      return;
    }
    setTreeService(null);
    if (!keepPanelOnActiveEnvironmentChange.current) {
      setPanelService(null);
      if (urlMode) onUrlPathTailChange?.("", urlNavigateCanvas);
    }
    keepPanelOnActiveEnvironmentChange.current = false;
  }, [activeEnvironment, onUrlPathTailChange, urlMode]);

  React.useEffect(() => {
    if (!cmdkOpen) setCmdkOpenTo(undefined);
  }, [cmdkOpen]);

  const openPalette = React.useCallback((to?: { screen: Screen; dbType?: ServiceType }) => {
    setCmdkOpenTo(to);
    setCmdkOpen(true);
  }, []);

  const onAddService = React.useCallback(
    (payload: AddServicePayload) => {
      const id = newServiceId();
      setServicesList((prev) => {
        const i = prev.length;
        const urlId = nextAvailableUrlId(prev);
        const next: Service = {
          id,
          name: payload.name,
          type: payload.type,
          status: payload.status,
          urlId,
          environmentName: environmentDisplayNameFromKey(activeEnvironment),
        };
        if (cardLayoutMode === "free") {
          return [...prev, { ...next, ...defaultCanvasFreePosition(i, prev.length + 1) }];
        }
        return [...prev, next];
      });
    },
    [cardLayoutMode, activeEnvironment],
  );

  const onReorderServices = React.useCallback((next: Service[]) => {
    setServicesList((prev) => mergeReorderedSubset(prev, next));
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {enableEnvironmentServiceCanvas ? (
        <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden">
          <AnimatePresence mode="wait">
            {effectiveTreeService ? (
              <div
                key={effectiveTreeService.id}
                className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden"
              >
                <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                  <ServiceTreeView
                    service={effectiveTreeService}
                    onBack={exitTreeView}
                    onOpenCommandPalette={() => openPalette({ screen: "db-choose" })}
                    initialServicePanelOpen={false}
                    selectedCloneUrlId={selectedCloneUrlId}
                    onNavigateCloneUrlId={
                      urlMode && onUrlPathTailChange
                        ? (id: number) =>
                            onUrlPathTailChange(
                              buildEnvironmentUrlPath(id, "overview"),
                              urlNavigateService,
                            )
                        : undefined
                    }
                    urlDetailSync={urlMode}
                    onCloneForestChange={handleCloneForestChange}
                  />
                </div>
                {urlMode && dockedPanelService ? (
                  <div
                    className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
                    style={{ width: SERVICE_RIGHT_PANEL_WIDTH_PX }}
                  >
                    <ServiceTopologyServiceDock
                      service={dockedPanelService}
                      subtitle={panelSubtitle}
                      onClose={closeDockedPanel}
                      {...(servicePanelUrlProps ?? {})}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                key="canvas-split"
                className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden"
              >
                <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                  <EnvironmentsServicesCanvas
                    services={canvasServices}
                    inventoryServices={servicesList}
                    inventoryEnvironmentOrder={environments}
                    selectedServiceId={mainCanvasSelectedId}
                    onSelectService={selectFromCanvas}
                    onOpenServiceWorkspace={openServiceWorkspace}
                    onOpenCommandPalette={() => openPalette({ screen: "db-choose" })}
                    onReorderServices={onReorderServices}
                    cardLayoutMode={cardLayoutMode}
                    onCardLayoutModeChange={handleCardLayoutModeChange}
                    activeEnvironment={activeEnvironment}
                    onInventorySelect={handleInventorySelect}
                    inventoryGroupBy={listGroupBy}
                    onInventoryGroupByChange={setListGroupBy}
                    focusServiceId={canvasFocusServiceId}
                    onFocusServiceApplied={handleFocusServiceApplied}
                    showEnvironmentList={showEnvironmentList}
                    onToggleEnvironmentList={handleToggleEnvironmentList}
                    onDismissCanvasUrlSelection={
                      urlMode ? dismissCanvasUrlSelection : undefined
                    }
                  />
                </div>
                {dockedPanelService ? (
                  <div
                    className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
                    style={{ width: SERVICE_RIGHT_PANEL_WIDTH_PX }}
                  >
                    <EnvironmentCanvasServiceDock
                      service={dockedPanelService}
                      subtitle={panelSubtitle}
                      onClose={closeDockedPanel}
                      {...(servicePanelUrlProps ?? {})}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : effectiveTreeService ? (
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-row overflow-hidden">
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <ServiceTreeView
              key={effectiveTreeService.id}
              service={effectiveTreeService}
              onBack={exitTreeView}
              onOpenCommandPalette={() => openPalette({ screen: "db-choose" })}
              initialServicePanelOpen={false}
              selectedCloneUrlId={selectedCloneUrlId}
              onNavigateCloneUrlId={
                urlMode && onUrlPathTailChange
                  ? (id: number) =>
                      onUrlPathTailChange(
                        buildEnvironmentUrlPath(id, "overview"),
                        urlNavigateService,
                      )
                  : undefined
              }
              urlDetailSync={urlMode}
              onCloneForestChange={handleCloneForestChange}
            />
          </div>
          {urlMode && dockedPanelService ? (
            <div
              className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: SERVICE_RIGHT_PANEL_WIDTH_PX }}
            >
              <ServiceTopologyServiceDock
                service={dockedPanelService}
                subtitle={panelSubtitle}
                onClose={closeDockedPanel}
                {...(servicePanelUrlProps ?? {})}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-row overflow-hidden">
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <EnvironmentsServicesCanvas
              key="canvas"
              services={canvasServices}
              inventoryServices={servicesList}
              inventoryEnvironmentOrder={environments}
              selectedServiceId={mainCanvasSelectedId}
              onSelectService={selectFromCanvas}
              onOpenServiceWorkspace={openServiceWorkspace}
              onOpenCommandPalette={() => openPalette({ screen: "db-choose" })}
              onReorderServices={onReorderServices}
              cardLayoutMode={cardLayoutMode}
              onCardLayoutModeChange={handleCardLayoutModeChange}
              activeEnvironment={activeEnvironment}
              onInventorySelect={handleInventorySelect}
              inventoryGroupBy={listGroupBy}
              onInventoryGroupByChange={setListGroupBy}
              focusServiceId={canvasFocusServiceId}
              onFocusServiceApplied={handleFocusServiceApplied}
              showEnvironmentList={showEnvironmentList}
              onToggleEnvironmentList={handleToggleEnvironmentList}
              onDismissCanvasUrlSelection={
                urlMode ? dismissCanvasUrlSelection : undefined
              }
            />
          </div>
          {dockedPanelService ? (
            <div
              className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: SERVICE_RIGHT_PANEL_WIDTH_PX }}
            >
              <EnvironmentCanvasServiceDock
                service={dockedPanelService}
                subtitle={panelSubtitle}
                onClose={closeDockedPanel}
                {...(servicePanelUrlProps ?? {})}
              />
            </div>
          ) : null}
        </div>
      )}

      <CmdKPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        openTo={cmdkOpenTo}
        onAddService={onAddService}
        overlay="layout"
      />
    </div>
  );
}
