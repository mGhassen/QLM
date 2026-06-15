import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@guepard/ui/utils";

import type { CloneForestNode } from "../../environment-clone-tree";
import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import { EnvironmentsCanvasBottomBar } from "./environments-canvas-bottom-bar";
import { EnvironmentsCanvasLayoutTopBar } from "./environments-canvas-layout-top-bar";
import {
  EnvironmentsEnvironmentList,
  type DeploymentListGroupBy,
  type DeploymentListSelection,
} from "./environments-environment-list";
import type { Service } from "./service-card";
import {
  buildCloneWorkspaceRfGraph,
  buildServiceGridRfState,
  type EnvRfCloneWorkspaceArgs,
} from "./environments-rf/environments-rf-graph";
import {
  EnvironmentsRfSurface,
  type EnvironmentsRfBridge,
} from "./environments-rf/environments-rf-surface";

export type EnvironmentsCanvasCardRole = "service" | "clone";

export type { CanvasCardLayoutMode } from "./canvas-card-layout";

export type EnvironmentsCanvasCloneWorkspace = EnvRfCloneWorkspaceArgs;

export { defaultCanvasFreePosition, gridLayoutColumnCount } from "./environments-rf/environment-rf-layout";

export const ENVIRONMENTS_CANVAS_SERVICE_DRAG =
  "data-environments-canvas-service-drag";

export const ENVIRONMENTS_CANVAS_SERVICE_FOCUS = "data-service-focus";

export function EnvironmentsServicesCanvas({
  services,
  onSelectService,
  onOpenServiceWorkspace,
  onOpenCommandPalette,
  selectedServiceId,
  onReorderServices,
  cardLayoutMode = "grid",
  onCardLayoutModeChange,
  inventoryServices,
  inventoryEnvironmentOrder,
  activeEnvironment,
  onInventorySelect,
  showEnvironmentList,
  onToggleEnvironmentList,
  inventoryGroupBy,
  onInventoryGroupByChange,
  focusServiceId,
  onFocusServiceApplied,
  onDismissCanvasUrlSelection,
  cardRole = "service",
  onOpenCloneMasking,
  disableWheelZoomScale = false,
  cloneWorkspace,
  layoutTopBarStandalone = false,
}: {
  services: Service[];
  onSelectService: (s: Service) => void;
  onOpenServiceWorkspace?: (s: Service) => void;
  onOpenCloneMasking?: (s: Service) => void;
  disableWheelZoomScale?: boolean;
  cardRole?: EnvironmentsCanvasCardRole;
  onOpenCommandPalette?: () => void;
  selectedServiceId?: string | null;
  onReorderServices?: (next: Service[]) => void;
  cardLayoutMode?: CanvasCardLayoutMode;
  onCardLayoutModeChange?: (mode: CanvasCardLayoutMode) => void;
  inventoryServices?: Service[];
  inventoryEnvironmentOrder?: string[];
  activeEnvironment?: string;
  onInventorySelect?: (sel: DeploymentListSelection) => void;
  showEnvironmentList?: boolean;
  onToggleEnvironmentList?: () => void;
  inventoryGroupBy?: DeploymentListGroupBy;
  onInventoryGroupByChange?: (v: DeploymentListGroupBy) => void;
  focusServiceId?: string | null;
  onFocusServiceApplied?: () => void;
  onDismissCanvasUrlSelection?: () => void;
  /** Service tree workspace: primary + clone forest as one React Flow graph. */
  cloneWorkspace?: EnvironmentsCanvasCloneWorkspace | null;
  layoutTopBarStandalone?: boolean;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const bridgeRef = React.useRef<EnvironmentsRfBridge | null>(null);
  const [scalePct, setScalePct] = React.useState(100);

  const sortable = Boolean(onReorderServices);
  const showLayoutTopBar = Boolean(
    onCardLayoutModeChange &&
      !showEnvironmentList &&
      (sortable || layoutTopBarStandalone),
  );

  const openWorkspace = onOpenServiceWorkspace ?? onSelectService;

  const graph = React.useMemo(() => {
    if (cloneWorkspace) {
      return buildCloneWorkspaceRfGraph(cloneWorkspace);
    }
    return buildServiceGridRfState({
      services,
      cardRole,
      cardLayoutMode,
      selectedServiceId: selectedServiceId ?? null,
      sortable,
      onSelect: onSelectService,
      onExpand: openWorkspace,
      onOpenCloneMasking,
    });
  }, [
    cloneWorkspace,
    services,
    cardRole,
    cardLayoutMode,
    selectedServiceId,
    sortable,
    onSelectService,
    openWorkspace,
    onOpenCloneMasking,
  ]);

  const { nodes, edges, sheetW, sheetH } = graph;

  const zoomIn = React.useCallback(() => {
    bridgeRef.current?.zoomIn();
  }, []);
  const zoomOut = React.useCallback(() => {
    bridgeRef.current?.zoomOut();
  }, []);
  const fitView = React.useCallback(() => {
    bridgeRef.current?.fitView();
  }, []);

  React.useLayoutEffect(() => {
    if (showEnvironmentList || !focusServiceId) return;
    const id = requestAnimationFrame(() => {
      bridgeRef.current?.focusServiceCard(focusServiceId);
      onFocusServiceApplied?.();
    });
    return () => cancelAnimationFrame(id);
  }, [focusServiceId, showEnvironmentList, onFocusServiceApplied, nodes.length]);

  React.useLayoutEffect(() => {
    if (showEnvironmentList || !selectedServiceId) return;
    const id = requestAnimationFrame(() => {
      bridgeRef.current?.focusServiceCard(selectedServiceId);
    });
    return () => cancelAnimationFrame(id);
  }, [selectedServiceId, showEnvironmentList, nodes.length]);

  const listServices = inventoryServices ?? [];
  const listActive = activeEnvironment ?? "production";
  const mainViewport =
    showEnvironmentList &&
    onInventorySelect &&
    onToggleEnvironmentList ? (
      <div className="min-h-0 flex-1 overflow-hidden">
        <EnvironmentsEnvironmentList
          services={listServices}
          environmentOrder={inventoryEnvironmentOrder}
          groupBy={inventoryGroupBy ?? "none"}
          onGroupByChange={
            onInventoryGroupByChange ??
            (() => {
              /* stories may omit */
            })
          }
          activeEnvironment={listActive}
          selectedServiceId={selectedServiceId}
          onSelect={onInventorySelect}
        />
      </div>
    ) : (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <EnvironmentsRfSurface
          bridgeRef={bridgeRef}
          viewportRef={viewportRef}
          initialNodes={nodes}
          initialEdges={edges}
          sheetW={sheetW}
          sheetH={sheetH}
          cardLayoutMode={cardLayoutMode}
          sortable={sortable}
          cardRole={cardRole}
          services={services}
          onReorderServices={onReorderServices}
          disableWheelZoomScale={disableWheelZoomScale}
          onDismissCanvasUrlSelection={onDismissCanvasUrlSelection}
          showEnvironmentList={Boolean(showEnvironmentList)}
          onZoomPctChange={setScalePct}
          forestRoots={cloneWorkspace?.forest}
          onReorderForestRoots={cloneWorkspace?.onReorderRoots}
        />
      </div>
    );

  return (
    <motion.div
      className="absolute inset-0 cursor-default overflow-hidden bg-env-canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div
        className={cn(
          "absolute inset-0 z-[5] flex min-h-0 flex-col overflow-hidden pb-24",
          !showEnvironmentList && "cursor-grab active:cursor-grabbing",
        )}
        aria-label="Service canvas — drag empty space to pan; wheel pans; Ctrl or ⌘ + wheel zooms"
      >
        {mainViewport}
      </div>

      {showLayoutTopBar && onCardLayoutModeChange ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[26]">
          <EnvironmentsCanvasLayoutTopBar
            mode={cardLayoutMode}
            onChange={onCardLayoutModeChange}
          />
        </div>
      ) : null}

      {onOpenCommandPalette ? (
        <div className="pointer-events-none absolute inset-0 z-[25] flex items-end justify-center pb-5">
          <EnvironmentsCanvasBottomBar
            scalePct={scalePct}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFitView={fitView}
            onOpenCommandPalette={onOpenCommandPalette}
            onEnvironmentList={onToggleEnvironmentList}
            environmentListActive={showEnvironmentList}
            zoomControlsDisabled={showEnvironmentList}
          />
        </div>
      ) : null}
    </motion.div>
  );
}
