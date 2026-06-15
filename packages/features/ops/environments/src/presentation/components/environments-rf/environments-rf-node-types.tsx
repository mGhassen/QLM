import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@guepard/ui/utils";

import { CloneCard } from "../clone-card";
import { ENVIRONMENTS_CANVAS_SERVICE_DRAG, ENVIRONMENTS_CANVAS_SERVICE_FOCUS } from "../environments-services-canvas";
import { ServiceCard } from "../service-card";
import type { EnvRfNodeData } from "./environments-rf-graph";
import {
  ENV_RF_CLONE_HANDLE_SOURCE_OUT,
  ENV_RF_CLONE_HANDLE_TARGET_IN,
  ENV_RF_MERGED_STACK_TOP_PAD_PX,
} from "./environment-rf-layout";

/**
 * Styling only — keep default .react-flow__handle width/height (internals use offset + rect).
 */
const RF_HANDLE_CLASS =
  "!pointer-events-none !z-[40] rounded-full border border-muted-foreground/35 bg-muted/90 shadow-none";

function BranchToggleChrome({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-1/2">
      <button
        type="button"
        aria-label={collapsed ? "Expand branch" : "Collapse branch"}
        title={collapsed ? "Expand branch" : "Collapse branch"}
        onClick={(ev) => {
          ev.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted/70 hover:text-foreground",
        )}
      >
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </div>
  );
}

function parseStylePx(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    return Number.parseInt(String(v).replace("px", ""), 10);
  }
  return NaN;
}

export function EnvServiceCardNode({ id, data }: NodeProps<Node<EnvRfNodeData>>) {
  const d = data;
  const cardMeasureRef = useRef<HTMLDivElement>(null);
  const { getNode, updateNode } = useReactFlow();
  const updateInternals = useUpdateNodeInternals();

  const syncMeasuredNodeSize = useCallback(() => {
    const card = cardMeasureRef.current;
    if (!card) return;
    const w = Math.round(card.offsetWidth);
    const h = Math.round(card.offsetHeight);
    if (w <= 0 || h <= 0) return;
    const node = getNode(id);
    if (!node) return;
    const curW = parseStylePx(node.style?.width);
    const curH = parseStylePx(node.style?.height);
    if (Number.isFinite(curW) && Number.isFinite(curH) && curW === w && curH === h) {
      return;
    }
    updateNode(id, {
      style: { ...node.style, width: w, height: h },
    });
    updateInternals(id);
  }, [getNode, id, updateInternals, updateNode]);

  useLayoutEffect(() => {
    syncMeasuredNodeSize();
  }, [
    syncMeasuredNodeSize,
    d.service.id,
    d.selected,
    d.stacked,
    d.service.name,
    d.service.type,
    d.service.dataMaskingEnabled,
    d.service.databaseVersion,
    d.service.environmentName,
    d.service.cloneUrlIds?.length,
    d.service.mergedCloneStackPreview?.total,
    d.service.externalDatasource?.syncEnabled,
    d.service.nodeName,
  ]);

  useEffect(() => {
    const card = cardMeasureRef.current;
    if (!card || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => syncMeasuredNodeSize());
    ro.observe(card);
    return () => ro.disconnect();
  }, [syncMeasuredNodeSize]);

  return (
    <div
      className="relative h-fit min-h-0 w-full min-w-0"
      {...{
        [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
        [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]: d.service.id,
      }}
    >
      <ServiceCard
        measureRef={cardMeasureRef}
        service={d.service}
        selected={d.selected}
        stacked={d.stacked}
        onClick={() => d.onSelect?.()}
        onExpand={() => d.onExpand?.()}
        workspaceButtonVisibility={d.branchingButtonVisibility ?? "hover"}
      />
      <Handle type="target" position={Position.Top} className={RF_HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} className={RF_HANDLE_CLASS} />
    </div>
  );
}

export function EnvCloneCardNode({ id, data }: NodeProps<Node<EnvRfNodeData>>) {
  const d = data;
  const mergedStack = d.service.mergedCloneStackPreview;
  const cardMeasureRef = useRef<HTMLDivElement>(null);
  const { getNode, updateNode } = useReactFlow();
  const updateInternals = useUpdateNodeInternals();

  const syncMeasuredNodeHeight = useCallback(() => {
    const card = cardMeasureRef.current;
    if (!card) return;
    const h = Math.round(card.offsetHeight);
    if (h <= 0) return;
    const node = getNode(id);
    if (!node) return;
    const curN = parseStylePx(node.style?.height);
    if (Number.isFinite(curN) && curN === h) {
      return;
    }
    updateNode(id, {
      style: { ...node.style, height: h },
    });
    updateInternals(id);
  }, [getNode, id, updateInternals, updateNode]);

  useLayoutEffect(() => {
    syncMeasuredNodeHeight();
  }, [
    syncMeasuredNodeHeight,
    d.service.id,
    d.selected,
    d.stacked,
    d.service.name,
    d.service.dataMaskingEnabled,
    d.service.mergedCloneStackPreview?.total,
    d.service.type,
    d.service.databaseVersion,
  ]);

  useEffect(() => {
    const card = cardMeasureRef.current;
    if (!card || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => syncMeasuredNodeHeight());
    ro.observe(card);
    return () => ro.disconnect();
  }, [syncMeasuredNodeHeight]);

  return (
    <div
      className="relative h-fit min-h-0 w-full min-w-0"
      {...{
        [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]: d.service.id,
      }}
    >
      <CloneCard
        measureRef={cardMeasureRef}
        service={d.service}
        selected={d.selected}
        stacked={d.stacked}
        onClick={() => d.onSelect?.()}
        onOpenBranching={() => d.onExpand?.()}
        onOpenMasking={() => d.onOpenCloneMasking?.()}
        onCreateDownstreamClone={() => d.onCreateDownstream?.()}
        branchingButtonVisibility={d.branchingButtonVisibility ?? "hover"}
      />
      <Handle
        id={ENV_RF_CLONE_HANDLE_TARGET_IN}
        type="target"
        position={Position.Top}
        className={RF_HANDLE_CLASS}
        style={mergedStack != null ? { top: ENV_RF_MERGED_STACK_TOP_PAD_PX } : undefined}
      />
      <Handle
        id={ENV_RF_CLONE_HANDLE_SOURCE_OUT}
        type="source"
        position={Position.Bottom}
        className={RF_HANDLE_CLASS}
      />
      {d.branchToggle ? (
        <BranchToggleChrome
          collapsed={d.branchToggle.collapsed}
          onToggle={d.branchToggle.onToggle}
        />
      ) : null}
      {d.mergeRowStrip ? (
        <div className="pointer-events-auto absolute -bottom-2 left-1/2 z-30 -translate-x-1/2 translate-y-1/2">
          <button
            type="button"
            aria-label="Collapse clones"
            title="Collapse clones"
            onClick={(ev) => {
              ev.stopPropagation();
              d.mergeRowStrip?.onCollapse();
            }}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
