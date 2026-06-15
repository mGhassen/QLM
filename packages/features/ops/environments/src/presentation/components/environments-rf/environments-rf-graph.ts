import type { Edge, Node } from "@xyflow/react";

/** XYFlow step/smooth-step edges default `offset: 20`, which leaves visible gaps from handles. */
const stepEdgeNoGap = { offset: 0 };

import { environmentsCloneCardWidthPx as cardWFromLayout } from "../../../environment-clone-canvas-layout";
import type { CloneForestNode } from "../../../environment-clone-tree";
import { cloneForestTimelineMinWidthPx } from "../clone-forest-timeline";
import type { CanvasCardLayoutMode } from "../canvas-card-layout";
import type { EnvironmentsCanvasCardRole } from "../environments-services-canvas";
import type { Service } from "../service-card";
import {
  computeGridPositions,
  computeSheetExtentForGrid,
  computeWorkspaceGraphBounds,
  defaultCanvasFreePosition,
  ENV_RF_CARD_HEIGHT_PX,
  ENV_RF_CLONE_HANDLE_SOURCE_OUT,
  ENV_RF_CLONE_HANDLE_TARGET_IN,
  ENV_RF_MERGED_STACK_CARD_HEIGHT_PX,
  ENV_RF_SOURCE_TO_ROW_GAP_PX,
  ENV_RF_SOURCE_WITH_MERGE_STRIP_HEIGHT_PX,
  FREE_CARD_MAX_H,
  FREE_CARD_MAX_W,
  layoutCloneForestGrid,
  layoutTimelineForest,
  type ForestLayoutEntry,
} from "./environment-rf-layout";

export type EnvRfNodeData = {
  service: Service;
  stacked: boolean;
  selected: boolean;
  cardRole: EnvironmentsCanvasCardRole;
  onSelect?: () => void;
  onExpand?: () => void;
  onOpenCloneMasking?: () => void;
  onCreateDownstream?: () => void;
  branchToggle?: {
    collapsed: boolean;
    onToggle: () => void;
  };
  isCollapsedForestPreview?: boolean;
  branchingButtonVisibility?: "hover" | "always";
  mergeRowStrip?: { onCollapse: () => void };
};

export type EnvRfBuildServiceGridArgs = {
  services: Service[];
  cardRole: EnvironmentsCanvasCardRole;
  cardLayoutMode: CanvasCardLayoutMode;
  selectedServiceId: string | null;
  sortable: boolean;
  onSelect: (s: Service) => void;
  onExpand: (s: Service) => void;
  onOpenCloneMasking?: (s: Service) => void;
};

export function buildServiceGridRfState(args: EnvRfBuildServiceGridArgs): {
  nodes: Node<EnvRfNodeData>[];
  edges: Edge[];
  sheetW: number;
  sheetH: number;
} {
  const {
    services,
    cardRole,
    cardLayoutMode,
    selectedServiceId,
    sortable,
    onSelect,
    onExpand,
    onOpenCloneMasking,
  } = args;
  const isFree = cardLayoutMode === "free";
  const { positions, packWidth } = computeGridPositions(services, cardRole);
  const sheet = computeSheetExtentForGrid(
    services,
    cardLayoutMode,
    isFree && sortable,
  );
  const sheetW = Math.max(sheet.w, packWidth + 400);
  const sheetH = sheet.h;

  const nodes: Node<EnvRfNodeData>[] = services.map((s, i) => {
    const pos = isFree
      ? {
          x: s.x ?? defaultCanvasFreePosition(i, services.length).x,
          y: s.y ?? defaultCanvasFreePosition(i, services.length).y,
        }
      : (positions.get(s.id) ?? { x: 0, y: 0 });
    const w = cardRole === "clone" ? cardWFromLayout(s.type) : FREE_CARD_MAX_W;
    const h = cardRole === "clone" ? ENV_RF_CARD_HEIGHT_PX : FREE_CARD_MAX_H;
    const stacked = (s.cloneUrlIds?.length ?? 0) > 0;
    return {
      id: `svc-${s.id}`,
      type: cardRole === "clone" ? "envCloneCard" : "envServiceCard",
      position: pos,
      style: { width: w, height: h },
      draggable: Boolean(sortable),
      selectable: true,
      data: {
        service: s,
        stacked,
        selected: selectedServiceId === s.id,
        cardRole,
        onSelect: () => onSelect(s),
        onExpand: () => onExpand(s),
        onOpenCloneMasking: onOpenCloneMasking
          ? () => onOpenCloneMasking(s)
          : undefined,
        branchingButtonVisibility: "hover",
      },
    };
  });

  return { nodes, edges: [], sheetW, sheetH };
}

function collectVisibleCloneForestEdges(
  roots: CloneForestNode[],
  collapsedSubtreeIds: ReadonlySet<string>,
): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const walk = (n: CloneForestNode) => {
    const collapsedHere =
      collapsedSubtreeIds.has(n.treeId) && n.children.length > 1;
    if (collapsedHere) return;
    for (const ch of n.children) {
      out.push({ from: n.treeId, to: ch.treeId });
      walk(ch);
    }
  };
  for (const r of roots) walk(r);
  return out;
}

export type EnvRfCloneWorkspaceArgs = {
  source: Service;
  sourceNodeId: string;
  forest: CloneForestNode[];
  layoutMode: CanvasCardLayoutMode;
  collapsedSubtreeIds: ReadonlySet<string>;
  showMergedOnly: boolean;
  mergedStackService: Service | null;
  showBranchToggle: boolean;
  selectedServiceId: string | null;
  onSelectClone: (s: Service) => void;
  onOpenBranching: (s: Service) => void;
  onOpenMasking: (s: Service) => void;
  onCreateDownstreamClone: (s: Service) => void;
  onToggleSubtreeCollapse: (treeId: string) => void;
  mergeRowStrip?: { onCollapse: () => void } | null;
  onReorderRoots?: (next: CloneForestNode[]) => void;
};

export function buildCloneWorkspaceRfGraph(
  args: EnvRfCloneWorkspaceArgs,
): {
  nodes: Node<EnvRfNodeData>[];
  edges: Edge[];
  sheetW: number;
  sheetH: number;
} {
  const {
    source,
    sourceNodeId,
    forest,
    layoutMode,
    collapsedSubtreeIds,
    showMergedOnly,
    mergedStackService,
    showBranchToggle,
    selectedServiceId,
    onSelectClone,
    onOpenBranching,
    onOpenMasking,
    onCreateDownstreamClone,
    onToggleSubtreeCollapse,
    mergeRowStrip,
  } = args;

  const sourceW = cardWFromLayout(source.type);
  const nodes: Node<EnvRfNodeData>[] = [];
  const edges: Edge[] = [];
  const PAD = 280;
  const freeStagger = layoutMode === "free";

  const sourceH =
    mergeRowStrip != null
      ? ENV_RF_SOURCE_WITH_MERGE_STRIP_HEIGHT_PX
      : ENV_RF_CARD_HEIGHT_PX;

  const sourceY = PAD;
  const sourceX = PAD;
  nodes.push({
    id: sourceNodeId,
    type: "envCloneCard",
    position: { x: sourceX, y: sourceY },
    style: { width: sourceW, height: sourceH },
    draggable: false,
    zIndex: 10,
    data: {
      service: source,
      stacked: (source.cloneUrlIds?.length ?? 0) > 0,
      selected: false,
      cardRole: "clone",
      onSelect: () => onSelectClone(source),
      onExpand: () => onOpenBranching(source),
      onOpenCloneMasking: () => onOpenMasking(source),
      onCreateDownstream: () => onCreateDownstreamClone(source),
      branchingButtonVisibility: "always",
      mergeRowStrip: mergeRowStrip ?? undefined,
    },
  });

  const forestBaseY = sourceY + sourceH + ENV_RF_SOURCE_TO_ROW_GAP_PX;

  if (showMergedOnly && mergedStackService) {
    const mw = cardWFromLayout(mergedStackService.type);
    const mx = sourceX + sourceW / 2 - mw / 2;
    const my = forestBaseY;
    const mergedH = ENV_RF_MERGED_STACK_CARD_HEIGHT_PX;
    nodes.push({
      id: `env-merged-${mergedStackService.id}`,
      type: "envCloneCard",
      position: { x: mx, y: my },
      style: { width: mw, height: mergedH },
      draggable: false,
      data: {
        service: mergedStackService,
        stacked: false,
        selected: selectedServiceId === mergedStackService.id,
        cardRole: "clone",
        onSelect: () => onSelectClone(mergedStackService),
        onExpand: () => onOpenBranching(mergedStackService),
        onCreateDownstream: () =>
          onCreateDownstreamClone(mergedStackService),
        branchingButtonVisibility: "hover",
      },
    });
    edges.push({
      id: "e-src-merged",
      source: sourceNodeId,
      target: `env-merged-${mergedStackService.id}`,
      sourceHandle: ENV_RF_CLONE_HANDLE_SOURCE_OUT,
      targetHandle: ENV_RF_CLONE_HANDLE_TARGET_IN,
      pathOptions: stepEdgeNoGap,
      style: { strokeWidth: 2 },
    } as Edge);
    const { width, height } = computeWorkspaceGraphBounds(
      sourceW,
      [],
      true,
      mw,
      { sourcePx: sourceH, mergedPx: mergedH },
    );
    return {
      nodes,
      edges,
      sheetW: width + PAD,
      sheetH: height + PAD,
    };
  }

  const layoutEntries: ForestLayoutEntry[] =
    layoutMode === "timeline"
      ? layoutTimelineForest(forest, collapsedSubtreeIds)
      : layoutCloneForestGrid(
          forest,
          collapsedSubtreeIds,
          showBranchToggle,
          freeStagger,
        );

  for (const e of layoutEntries) {
    const nid = `cf-${e.treeId}`;
    const nx = sourceX + sourceW / 2 + e.x;
    const ny = forestBaseY + e.y;
    nodes.push({
      id: nid,
      type: "envCloneCard",
      position: { x: nx, y: ny },
      style: { width: e.width, height: ENV_RF_CARD_HEIGHT_PX },
      draggable:
        layoutMode === "grid" &&
        forest.some((r) => r.treeId === e.treeId),
      zIndex: 5,
      data: {
        service: e.service,
        stacked: false,
        selected: selectedServiceId === e.service.id,
        cardRole: "clone",
        isCollapsedForestPreview: e.isCollapsedPreview,
        onSelect: () => {
          if (e.isCollapsedPreview) {
            onToggleSubtreeCollapse(
              e.treeId.replace(/__preview$/, ""),
            );
            return;
          }
          onSelectClone(e.service);
        },
        onExpand: () => onOpenBranching(e.service),
        onOpenCloneMasking: () => onOpenMasking(e.service),
        onCreateDownstream: () => onCreateDownstreamClone(e.service),
        branchToggle: e.branchToggleAfter
          ? {
              collapsed: collapsedSubtreeIds.has(e.treeId),
              onToggle: () => onToggleSubtreeCollapse(e.treeId),
            }
          : undefined,
        branchingButtonVisibility: "hover",
      },
    });
  }

  for (const r of forest) {
    edges.push({
      id: `e-root-${r.treeId}`,
      source: sourceNodeId,
      target: `cf-${r.treeId}`,
      sourceHandle: ENV_RF_CLONE_HANDLE_SOURCE_OUT,
      targetHandle: ENV_RF_CLONE_HANDLE_TARGET_IN,
      pathOptions: stepEdgeNoGap,
      style: { strokeWidth: r === forest[0] ? 2 : 1.25 },
    } as Edge);
  }

  const vis = collectVisibleCloneForestEdges(forest, collapsedSubtreeIds);
  for (const { from, to } of vis) {
    edges.push({
      id: `e-${from}-${to}`,
      source: `cf-${from}`,
      target: `cf-${to}`,
      sourceHandle: ENV_RF_CLONE_HANDLE_SOURCE_OUT,
      targetHandle: ENV_RF_CLONE_HANDLE_TARGET_IN,
      pathOptions: stepEdgeNoGap,
      style: { strokeWidth: 1.25 },
    } as Edge);
  }

  for (const entry of layoutEntries) {
    if (!entry.isCollapsedPreview) continue;
    const parentTreeId = entry.treeId.replace(/__preview$/, "");
    edges.push({
      id: `e-col-${parentTreeId}`,
      source: `cf-${parentTreeId}`,
      target: `cf-${entry.treeId}`,
      sourceHandle: ENV_RF_CLONE_HANDLE_SOURCE_OUT,
      targetHandle: ENV_RF_CLONE_HANDLE_TARGET_IN,
      pathOptions: stepEdgeNoGap,
      style: { strokeWidth: 1.25 },
    } as Edge);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = Number(n.style?.width ?? 0);
    const h = Number(n.style?.height ?? ENV_RF_CARD_HEIGHT_PX);
    minX = Math.min(minX, n.position.x);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  const timelineMinW =
    layoutMode === "timeline"
      ? cloneForestTimelineMinWidthPx(forest) + 800
      : 0;
  const sheetW = Math.max(10_000, maxX - minX + PAD * 2, timelineMinW);
  const sheetH = Math.max(10_000, maxY + PAD * 2);

  return { nodes, edges, sheetW, sheetH };
}
