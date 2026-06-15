import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type CoordinateExtent,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import type { CloneForestNode } from "../../../environment-clone-tree";
import { EnvironmentsCanvasDotGrid } from "../environments-canvas-dot-grid";
import type { CanvasCardLayoutMode } from "../canvas-card-layout";
import type { EnvironmentsCanvasCardRole } from "../environments-services-canvas";
import {
  ENVIRONMENTS_CANVAS_SERVICE_DRAG,
  ENVIRONMENTS_CANVAS_SERVICE_FOCUS,
} from "../environments-services-canvas";
import type { Service } from "../service-card";
import {
  FREE_CARD_MAX_H,
  FREE_CARD_MAX_W,
} from "./environment-rf-layout";
import type { EnvRfNodeData } from "./environments-rf-graph";
import { EnvCloneCardNode, EnvServiceCardNode } from "./environments-rf-node-types";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function clampFreePositionToSheet(
  x: number,
  y: number,
  sheetW: number,
  sheetH: number,
): { x: number; y: number } {
  return {
    x: clamp(x, 24, sheetW - FREE_CARD_MAX_W - 24),
    y: clamp(y, 24, sheetH - FREE_CARD_MAX_H - 24),
  };
}

const nodeTypes = {
  envServiceCard: EnvServiceCardNode,
  envCloneCard: EnvCloneCardNode,
};

/**
 * Parent graph uses layout placeholders; service/clone nodes refine `style` from the DOM.
 * `setNodes(initialNodes)` in useEffect would otherwise wipe those refinements.
 */
function mergeInitialRfNodes(
  prev: Node<EnvRfNodeData>[],
  incoming: Node<EnvRfNodeData>[],
): Node<EnvRfNodeData>[] {
  const prevById = new Map(prev.map((n) => [n.id, n]));
  return incoming.map((next) => {
    const old = prevById.get(next.id);
    if (!old || old.type !== next.type) {
      return next;
    }
    if (next.type === "envCloneCard") {
      const prevH = old.style?.height;
      if (prevH == null || prevH === "") {
        return next;
      }
      return {
        ...next,
        style: {
          ...next.style,
          height: prevH,
        },
      };
    }
    if (next.type === "envServiceCard") {
      const prevW = old.style?.width;
      const prevH = old.style?.height;
      if (
        (prevW == null || prevW === "") &&
        (prevH == null || prevH === "")
      ) {
        return next;
      }
      return {
        ...next,
        style: {
          ...next.style,
          ...(prevW != null && prevW !== "" ? { width: prevW } : {}),
          ...(prevH != null && prevH !== "" ? { height: prevH } : {}),
        },
      };
    }
    return next;
  });
}

export type EnvironmentsRfBridge = {
  viewportElement: HTMLDivElement | null;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  focusServiceCard: (serviceId: string) => void;
};

type InnerProps = {
  initialNodes: Node<EnvRfNodeData>[];
  initialEdges: Edge[];
  sheetW: number;
  sheetH: number;
  cardLayoutMode: CanvasCardLayoutMode;
  sortable: boolean;
  cardRole: EnvironmentsCanvasCardRole;
  services: Service[];
  onReorderServices?: (next: Service[]) => void;
  disableWheelZoomScale: boolean;
  onDismissCanvasUrlSelection?: () => void;
  showEnvironmentList: boolean;
  onZoomPctChange: (pct: number) => void;
  bridgeRef: React.MutableRefObject<EnvironmentsRfBridge | null>;
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  forestRoots?: CloneForestNode[];
  onReorderForestRoots?: (next: CloneForestNode[]) => void;
};

function EnvironmentsRfSurfaceInner({
  initialNodes,
  initialEdges,
  sheetW: contentSheetW,
  sheetH: contentSheetH,
  cardLayoutMode,
  sortable,
  cardRole,
  services,
  onReorderServices,
  disableWheelZoomScale,
  onDismissCanvasUrlSelection,
  showEnvironmentList,
  onZoomPctChange,
  bridgeRef,
  viewportRef,
  forestRoots,
  onReorderForestRoots,
}: InnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const rf = useReactFlow();
  const {
    fitView,
    getZoom,
    zoomTo,
    setViewport,
    getNodes,
    setCenter,
  } = rf;
  const rfRef = useRef(rf);
  rfRef.current = rf;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const translateExtent = useMemo((): CoordinateExtent => {
    const pad = 8000;
    return [
      [-pad, -pad],
      [contentSheetW + pad, contentSheetH + pad],
    ];
  }, [contentSheetW, contentSheetH]);

  useEffect(() => {
    setNodes((prev) => mergeInitialRfNodes(prev, initialNodes));
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (showEnvironmentList) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.12, duration: 0 });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [fitView, showEnvironmentList, initialNodes.length, initialEdges.length]);

  const onMove = useCallback(() => {
    onZoomPctChange(Math.round(getZoom() * 100));
  }, [getZoom, onZoomPctChange]);

  useEffect(() => {
    const el = containerRef.current?.closest(".react-flow");
    const viewport = el?.querySelector(
      ".react-flow__viewport",
    ) as HTMLDivElement | null;

    const zoomIn = () => {
      const r = rfRef.current;
      r.zoomTo(clamp(r.getZoom() * 1.12, 0.35, 2.5));
    };
    const zoomOut = () => {
      const r = rfRef.current;
      r.zoomTo(clamp(r.getZoom() / 1.12, 0.35, 2.5));
    };
    const fit = () => {
      const r = rfRef.current;
      r.setViewport({ x: 0, y: 0, zoom: 1 });
      requestAnimationFrame(() => r.fitView({ padding: 0.12, duration: 0 }));
    };
    const focusServiceCard = (serviceId: string) => {
      const r = rfRef.current;
      const n = r.getNodes().find(
        (nn) => (nn.data as EnvRfNodeData | undefined)?.service?.id === serviceId,
      );
      if (!n) return;
      const w = Number(n.style?.width ?? FREE_CARD_MAX_W);
      const h = Number(n.style?.height ?? FREE_CARD_MAX_H);
      r.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
        zoom: r.getZoom(),
        duration: 280,
      });
    };

    viewportRef.current = viewport;
    bridgeRef.current = {
      viewportElement: viewport,
      zoomIn,
      zoomOut,
      fitView: fit,
      focusServiceCard,
    };
    return () => {
      viewportRef.current = null;
      bridgeRef.current = null;
    };
  }, [bridgeRef, viewportRef, contentSheetW, contentSheetH]);

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onDismissCanvasUrlSelection) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (
        t.closest(`[${ENVIRONMENTS_CANVAS_SERVICE_FOCUS}]`) ||
        t.closest(`[${ENVIRONMENTS_CANVAS_SERVICE_DRAG}]`)
      ) {
        return;
      }
      onDismissCanvasUrlSelection();
    },
    [onDismissCanvasUrlSelection],
  );

  const onWheelCapture = useCallback(
    (e: React.WheelEvent) => {
      if (disableWheelZoomScale) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const z = getZoom();
        const delta = -e.deltaY * 0.0015;
        zoomTo(clamp(z * (1 + delta), 0.35, 2.5));
      }
    },
    [disableWheelZoomScale, getZoom, zoomTo],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node<EnvRfNodeData>) => {
      const all = getNodes();
      const isFree = cardLayoutMode === "free";

      if (sortable && isFree && onReorderServices && node.id.startsWith("svc-")) {
        const id = node.id.slice("svc-".length);
        const nx =
          all.find((n) => n.id === node.id)?.position.x ?? node.position.x;
        const ny =
          all.find((n) => n.id === node.id)?.position.y ?? node.position.y;
        const sw = Math.max(contentSheetW, nx + FREE_CARD_MAX_W + 400);
        const sh = Math.max(contentSheetH, ny + FREE_CARD_MAX_H + 400);
        const nextPos = clampFreePositionToSheet(nx, ny, sw, sh);
        onReorderServices(
          services.map((svc) =>
            svc.id === id ? { ...svc, x: nextPos.x, y: nextPos.y } : svc,
          ),
        );
        return;
      }

      if (
        forestRoots &&
        onReorderForestRoots &&
        cardLayoutMode === "grid" &&
        node.id.startsWith("cf-")
      ) {
        const treeId = node.id.slice("cf-".length);
        const rootIds = new Set(forestRoots.map((r) => r.treeId));
        if (!rootIds.has(treeId)) return;
        const positions = new Map<string, number>();
        for (const n of all) {
          if (!n.id.startsWith("cf-")) continue;
          const tid = n.id.slice("cf-".length);
          if (rootIds.has(tid)) {
            positions.set(tid, n.position.x);
          }
        }
        const sorted = [...forestRoots].sort(
          (a, b) =>
            (positions.get(a.treeId) ?? 0) - (positions.get(b.treeId) ?? 0),
        );
        const same = sorted.every(
          (r, i) => r.treeId === forestRoots[i]!.treeId,
        );
        if (!same) onReorderForestRoots(sorted);
        return;
      }

      if (
        sortable &&
        cardLayoutMode === "grid" &&
        onReorderServices &&
        cardRole === "clone" &&
        node.id.startsWith("svc-")
      ) {
        const sorted = [...services].sort((a, b) => {
          const na = all.find((n) => n.id === `svc-${a.id}`);
          const nb = all.find((n) => n.id === `svc-${b.id}`);
          return (na?.position.x ?? 0) - (nb?.position.x ?? 0);
        });
        const same = sorted.every((s, i) => s.id === services[i]!.id);
        if (!same) onReorderServices(sorted);
      }
    },
    [
      cardLayoutMode,
      sortable,
      onReorderServices,
      services,
      cardRole,
      forestRoots,
      onReorderForestRoots,
      getNodes,
      contentSheetW,
      contentSheetH,
    ],
  );

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 w-full flex-1 flex-col"
      onWheelCapture={onWheelCapture}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        translateExtent={translateExtent}
        minZoom={0.35}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch={!disableWheelZoomScale}
        panOnScroll
        selectionOnDrag={false}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView={false}
        defaultEdgeOptions={{
          type: "step",
          style: {
            stroke: "hsl(var(--border))",
            strokeWidth: 1.35,
          },
        }}
        className="min-h-0 w-full flex-1 bg-[hsl(var(--env-canvas-bg))]"
      >
        <div
          aria-hidden
          className="pointer-events-none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: contentSheetW,
            height: contentSheetH,
            zIndex: -1,
          }}
        >
          <div className="relative h-full w-full">
            <EnvironmentsCanvasDotGrid />
          </div>
        </div>
      </ReactFlow>
    </div>
  );
}

export type EnvironmentsRfSurfaceProps = InnerProps;

export function EnvironmentsRfSurface({
  bridgeRef,
  viewportRef,
  ...rest
}: EnvironmentsRfSurfaceProps) {
  return (
    <ReactFlowProvider>
      <EnvironmentsRfSurfaceInner
        bridgeRef={bridgeRef}
        viewportRef={viewportRef}
        {...rest}
      />
    </ReactFlowProvider>
  );
}
