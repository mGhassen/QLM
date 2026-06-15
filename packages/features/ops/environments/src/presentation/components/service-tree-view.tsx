import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch, Lock, Plus,
  ChevronRight, ArrowLeft, X,
  Shield, MoreHorizontal,
} from "lucide-react";
import { cn } from "@qlm/ui/utils";

import {
  appendChildCloneUnderTreeId,
  appendRootCloneSibling,
  collectCloneForestSubtreeTreeIds,
  findCloneForestNodeByTreeId,
  findTreeIdByRowServiceId,
  flattenCloneForest,
  initialCloneForest,
  type CloneForestNode,
} from "../../environment-clone-tree";
import { cloneServicesForCanvas } from "../../environment-url-registry";
import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import {
  isCollapsedForestBranchPreviewService,
} from "./clone-forest-renderer";
import type { Service } from "./service-card";
import {
  EnvironmentsServicesCanvas,
  type EnvironmentsCanvasCloneWorkspace,
} from "./environments-services-canvas";
import { ServiceRightPanel, SERVICE_RIGHT_PANEL_WIDTH_PX } from "./service-right-panel";

const MERGED_CLONE_ROW_THRESHOLD = 3;
const MERGED_CLONE_STACK_ID_MARKER = "__merged-clone-stack";

function isMergedCloneStackService(s: Service) {
  return s.id.includes(MERGED_CLONE_STACK_ID_MARKER);
}

function buildMergedCloneStackPreviewService(
  parent: Service,
  cloneCount: number,
): Service {
  return {
    ...parent,
    id: `${parent.id}${MERGED_CLONE_STACK_ID_MARKER}`,
    name: `${cloneCount} clones`,
    cloneUrlIds: undefined,
    mergedCloneStackPreview: { total: cloneCount },
  };
}

// ── Panel types ───────────────────────────────────────────────────────────────
type PanelKind = "service" | "masking" | "branching";
interface PanelState { kind: PanelKind; cloneName?: string }

// ── Masking right panel ───────────────────────────────────────────────────────
const MASKING_RULES = [
  { field: "email",        rule: "Hash (SHA-256)",    active: true  },
  { field: "phone",        rule: "Partial mask",       active: true  },
  { field: "ssn",          rule: "Full redact",        active: true  },
  { field: "credit_card",  rule: "Last 4 digits",      active: false },
  { field: "address",      rule: "Anonymize",          active: false },
];

function MaskingPanel({ cloneName, onClose }: { cloneName?: string; onClose: () => void }) {
  const [rules, setRules] = useState(MASKING_RULES);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-chart-4/20">
          <Shield className="h-4 w-4 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">Data Masking</div>
          <div className="text-[11px] text-muted-foreground">{cloneName ?? "primary"}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer border-0 bg-transparent p-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Masking Rules
        </div>
        {rules.map((r, i) => (
          <div
            key={r.field}
            className={cn(
              "mb-1.5 flex items-center gap-2.5 border bg-muted px-3 py-2.5",
              r.active ? "border-violet-500/50" : "border-border",
            )}
          >
            <Lock
              className={cn(
                "h-[11px] w-[11px] shrink-0",
                r.active ? "text-violet-400" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "font-mono text-xs",
                  r.active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {r.field}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{r.rule}</div>
            </div>
            <button
              type="button"
              onClick={() =>
                setRules((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, active: !x.active } : x)),
                )
              }
              className={cn(
                "relative h-4 w-[30px] shrink-0 cursor-pointer rounded-full border-0 transition-colors",
                r.active ? "bg-violet-600" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-card transition-[left]",
                  r.active ? "left-4" : "left-0.5",
                )}
              />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 border border-dashed border-border bg-transparent py-2 text-xs text-muted-foreground transition-colors hover:border-violet-400 hover:text-violet-400"
        >
          <Plus className="h-3 w-3" />
          Add rule
        </button>
      </div>

      <div className="flex gap-2 border-t border-border px-3.5 py-3">
        <button
          type="button"
          className="flex-1 cursor-pointer border border-border bg-transparent py-2 text-xs text-muted-foreground"
        >
          Reset
        </button>
        <button
          type="button"
          className="flex-1 cursor-pointer border-0 bg-violet-600 py-2 text-xs font-semibold text-white"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Branching right panel (git style) ─────────────────────────────────────────
const BRANCH_COLORS: Record<string, string> = {
  main: "#3b82f6", user2: "#f59e0b", "table user1": "#a78bfa",
};

const COMMITS = [
  { id: "wip",      branch: null,          message: "… wip …",               date: "03/04/2026 13:49", hash: "*",        isCurrent: false },
  { id: "c1",       branch: "user2",       message: "user 2 inserted",        date: "20/03/2026 17:04", hash: "763bffdd", isCurrent: false },
  { id: "c2",       branch: "table user1", message: "user with 1 inserted",   date: "20/03/2026 17:01", hash: "27cab792", isCurrent: false },
  { id: "c3",       branch: "main",        message: "prepare for data",       date: "20/03/2026 16:58", hash: "dd6082da", isCurrent: true  },
  { id: "c4",       branch: null,          message: "table created",          date: "20/03/2026 16:46", hash: "9dea8c59", isCurrent: false },
];

function BranchingPanel({ cloneName, onClose }: { cloneName?: string; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-500/15">
          <GitBranch className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">Branch History</div>
          <div className="text-[11px] text-muted-foreground">{cloneName ?? "primary"}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer border-0 bg-transparent p-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            angry-rain-ykkz73
          </div>
        </div>

        <div className="py-2">
          {COMMITS.map((commit, idx) => {
            const bColor = commit.branch
              ? (BRANCH_COLORS[commit.branch] ?? "#60a5fa")
              : undefined;
            return (
              <div
                key={commit.id}
                className={cn(
                  "ml-6 flex items-center gap-0 px-3.5",
                  idx === 0 ? "border-l-2 border-transparent" : "border-l-2 border-border",
                )}
              >
                <div className="relative -ml-[25px] flex w-6 shrink-0 self-stretch flex-col items-center justify-center">
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
                  <div
                    className={cn(
                      "relative z-[1] shrink-0 rounded-full",
                      commit.isCurrent
                        ? "h-3 w-3 border-2 border-blue-500 bg-card"
                        : "h-2 w-2 bg-muted-foreground",
                    )}
                    style={
                      !commit.isCurrent && bColor
                        ? { backgroundColor: bColor }
                        : undefined
                    }
                  />
                </div>

                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-2.5",
                    idx < COMMITS.length - 1 && "border-b border-border",
                  )}
                >
                  {commit.branch && bColor ? (
                    <div
                      className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        color: bColor,
                        borderColor: `${bColor}55`,
                        backgroundColor: `${bColor}22`,
                        borderWidth: 1,
                        borderStyle: "solid",
                      }}
                    >
                      <GitBranch className="h-[9px] w-[9px]" />
                      {commit.branch}
                    </div>
                  ) : null}
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-xs",
                      commit.branch ? "text-foreground" : "text-muted-foreground",
                      commit.id === "wip" && "italic",
                    )}
                  >
                    {commit.message}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{commit.date}</span>
                  <span className="min-w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                    {commit.hash}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer border-0 bg-transparent px-0.5 text-muted-foreground"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border px-3.5 py-3">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 border border-border bg-transparent py-2 text-xs text-muted-foreground transition-colors hover:border-blue-400 hover:text-blue-400"
        >
          <GitBranch className="h-3 w-3" />
          Create branch
        </button>
      </div>
    </div>
  );
}

// ── Main tree view ────────────────────────────────────────────────────────────
interface ServiceTreeViewProps {
  service: Service;
  onBack: () => void;
  /** Opens CmdK from the canvas bottom bar (same as environment workspace). */
  onOpenCommandPalette?: () => void;
  /** Opens the root service `ServiceRightPanel` on mount (mock surfaces every workspace block). */
  initialServicePanelOpen?: boolean;
  /** When set, clone cards update the workspace URL (`/environment/{id}`). */
  onNavigateCloneUrlId?: (urlId: number) => void;
  /**
   * When true, overview/detail uses the host docked panel (URL); this tree only keeps overlay
   * panels (masking / branching). Primary + clone cards navigate via {@link onNavigateCloneUrlId}.
   */
  urlDetailSync?: boolean;
  /** Highlights the clone card whose `urlId` matches. */
  selectedCloneUrlId?: number | null;
  /** Reports flat clone rows (incl. nested) so URL lookup can resolve every `urlId`. */
  onCloneForestChange?: (flatRows: Service[]) => void;
}

export function ServiceTreeView({
  service,
  onBack,
  onOpenCommandPalette,
  initialServicePanelOpen = false,
  onNavigateCloneUrlId,
  urlDetailSync = false,
  selectedCloneUrlId = null,
  onCloneForestChange,
}: ServiceTreeViewProps) {
  const clonePanArrowDomId = useId().replace(/:/g, "");
  const primaryCloneSourceAnchorId = `${clonePanArrowDomId}-clone-src`;

  const cloneCanvasServices = useMemo(() => cloneServicesForCanvas(service), [service]);
  const mergeCloneRow = cloneCanvasServices.length > MERGED_CLONE_ROW_THRESHOLD;

  const [forest, setForest] = useState(() => initialCloneForest(service));
  useEffect(() => {
    setForest(initialCloneForest(service));
  }, [service.id]);

  const [collapsedSubtreeIds, setCollapsedSubtreeIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  useEffect(() => {
    setCollapsedSubtreeIds(new Set());
  }, [service.id]);

  const toggleSubtreeCollapse = useCallback(
    (treeId: string) => {
      setCollapsedSubtreeIds((prev) => {
        const next = new Set(prev);
        if (next.has(treeId)) {
          const node = findCloneForestNodeByTreeId(forest, treeId);
          const toExpand = node
            ? collectCloneForestSubtreeTreeIds(node)
            : [treeId];
          for (const id of toExpand) {
            next.delete(id);
          }
        } else {
          next.add(treeId);
        }
        return next;
      });
    },
    [forest],
  );

  const [cloneRowExpanded, setCloneRowExpanded] = useState(
    () => !mergeCloneRow,
  );

  const [cardLayoutMode, setCardLayoutMode] = useState<CanvasCardLayoutMode>(
    "grid",
  );

  useEffect(() => {
    setCardLayoutMode("grid");
  }, [service.id]);

  useEffect(() => {
    setCloneRowExpanded(!mergeCloneRow);
  }, [service.id, mergeCloneRow, cloneCanvasServices.length]);

  const showMergedOnly = mergeCloneRow && !cloneRowExpanded;
  const flatForestRows = useMemo(() => flattenCloneForest(forest), [forest]);

  useEffect(() => {
    onCloneForestChange?.(flatForestRows);
  }, [flatForestRows, onCloneForestChange]);

  const prevSelectedCloneUrlIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedCloneUrlId == null) {
      prevSelectedCloneUrlIdRef.current = null;
      return;
    }
    const prev = prevSelectedCloneUrlIdRef.current;
    const selectionChanged = prev !== selectedCloneUrlId;
    prevSelectedCloneUrlIdRef.current = selectedCloneUrlId;
    if (!selectionChanged) return;
    if (!mergeCloneRow || cloneRowExpanded) return;

    const hit =
      cloneCanvasServices.some((c) => c.urlId === selectedCloneUrlId) ||
      flatForestRows.some((c) => c.urlId === selectedCloneUrlId);
    if (hit) {
      setCloneRowExpanded(true);
    }
  }, [
    selectedCloneUrlId,
    cloneCanvasServices,
    flatForestRows,
    mergeCloneRow,
    cloneRowExpanded,
  ]);

  const mergedStackPreviewService = useMemo(
    () => buildMergedCloneStackPreviewService(service, cloneCanvasServices.length),
    [service, cloneCanvasServices.length],
  );

  const gridCloneServices = showMergedOnly ? [mergedStackPreviewService] : [];

  const [panel, setPanel] = useState<PanelState | null>(() =>
    initialServicePanelOpen && !urlDetailSync ? { kind: "service" } : null,
  );

  useEffect(() => {
    if (!urlDetailSync) return;
    setPanel((p) => (p?.kind === "service" ? null : p));
  }, [urlDetailSync]);

  const clearOverlayPanel = useCallback(() => setPanel(null), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) {
          clearOverlayPanel();
          return;
        }
        onBack();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onBack, panel, clearOverlayPanel]);

  const PANEL_W = SERVICE_RIGHT_PANEL_WIDTH_PX;

  const treeSlideoutVisible =
    panel != null && !(urlDetailSync && panel.kind === "service");

  const openMaskingForClone = useCallback((s: Service) => {
    if (isCollapsedForestBranchPreviewService(s)) return;
    if (isMergedCloneStackService(s)) {
      setPanel({ kind: "masking", cloneName: undefined });
      return;
    }
    setPanel({ kind: "masking", cloneName: s.name });
  }, []);

  const handleSelectClone = useCallback(
    (s: Service) => {
      if (isCollapsedForestBranchPreviewService(s)) return;
      if (isMergedCloneStackService(s)) {
        setCloneRowExpanded(true);
        setCollapsedSubtreeIds(new Set());
        return;
      }
      if (s.urlId != null && onNavigateCloneUrlId) {
        onNavigateCloneUrlId(s.urlId);
        return;
      }
      setPanel({ kind: "service" });
    },
    [onNavigateCloneUrlId],
  );

  const handleOpenWorkspaceClone = useCallback((s: Service) => {
    if (isCollapsedForestBranchPreviewService(s)) return;
    if (isMergedCloneStackService(s)) {
      setCloneRowExpanded(true);
      setCollapsedSubtreeIds(new Set());
      return;
    }
    setPanel({ kind: "branching", cloneName: s.name });
  }, []);

  const spawnDownstream = useCallback(
    (row: Service) => {
      setForest((prev) => {
        if (row.id === service.id) {
          return appendRootCloneSibling(prev, service);
        }
        const tid = findTreeIdByRowServiceId(prev, row.id);
        return tid ? appendChildCloneUnderTreeId(prev, tid, service) : prev;
      });
    },
    [service],
  );

  const reorderForestRoots = useCallback((next: CloneForestNode[]) => {
    setForest(next);
  }, []);

  const selectedCloneCardId = useMemo(() => {
    if (selectedCloneUrlId == null) return null;
    if (showMergedOnly) {
      return (
        cloneCanvasServices.find((c) => c.urlId === selectedCloneUrlId)?.id ??
        flatForestRows.find((c) => c.urlId === selectedCloneUrlId)?.id ??
        null
      );
    }
    return (
      flatForestRows.find((c) => c.urlId === selectedCloneUrlId)?.id ?? null
    );
  }, [
    selectedCloneUrlId,
    showMergedOnly,
    cloneCanvasServices,
    flatForestRows,
  ]);

  const connectorCols = showMergedOnly
    ? 1
    : Math.max(1, forest.length);

  const cloneWorkspace = useMemo((): EnvironmentsCanvasCloneWorkspace => {
    const mergeRowStrip =
      mergeCloneRow && cloneRowExpanded && connectorCols > 1
        ? { onCollapse: () => setCloneRowExpanded(false) }
        : null;
    return {
      source: service,
      sourceNodeId: primaryCloneSourceAnchorId,
      forest,
      layoutMode: cardLayoutMode,
      collapsedSubtreeIds,
      showMergedOnly,
      mergedStackService: showMergedOnly ? mergedStackPreviewService : null,
      showBranchToggle: true,
      selectedServiceId: selectedCloneCardId,
      onSelectClone: handleSelectClone,
      onOpenBranching: handleOpenWorkspaceClone,
      onOpenMasking: openMaskingForClone,
      onCreateDownstreamClone: spawnDownstream,
      onToggleSubtreeCollapse: toggleSubtreeCollapse,
      onReorderRoots:
        cardLayoutMode === "grid" ? reorderForestRoots : undefined,
      mergeRowStrip,
    };
  }, [
    service,
    primaryCloneSourceAnchorId,
    forest,
    cardLayoutMode,
    collapsedSubtreeIds,
    showMergedOnly,
    mergedStackPreviewService,
    selectedCloneCardId,
    handleSelectClone,
    handleOpenWorkspaceClone,
    openMaskingForClone,
    spawnDownstream,
    toggleSubtreeCollapse,
    reorderForestRoots,
    mergeCloneRow,
    cloneRowExpanded,
    connectorCols,
  ]);

  return (
    <motion.div
      className="absolute inset-0 z-20 cursor-default overflow-hidden bg-env-canvas"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onClick={() => {
        if (!panel) onBack();
      }}
    >
      {/* Back breadcrumb */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-4 top-3 z-30 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 border border-border bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Canvas
        </button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-foreground">{service.name}</span>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 top-0 z-[5] transition-[right] duration-[250ms] ease-out"
        style={{ right: treeSlideoutVisible ? PANEL_W : 0 }}
      >
        <EnvironmentsServicesCanvas
          services={gridCloneServices}
          disableWheelZoomScale={false}
          cloneWorkspace={cloneWorkspace}
          onSelectService={handleSelectClone}
          onOpenServiceWorkspace={handleOpenWorkspaceClone}
          cardRole="clone"
          onOpenCloneMasking={openMaskingForClone}
          selectedServiceId={selectedCloneCardId}
          onOpenCommandPalette={onOpenCommandPalette}
          cardLayoutMode={cardLayoutMode}
          onCardLayoutModeChange={setCardLayoutMode}
          layoutTopBarStandalone
        />
      </div>

      {/* Right panel */}
      <AnimatePresence>
        {treeSlideoutVisible ? (
          <motion.div
            key={panel.kind}
            initial={{ x: PANEL_W }}
            animate={{ x: 0 }}
            exit={{ x: PANEL_W }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 right-0 top-0 z-30 flex flex-col border-l border-border bg-card"
            style={{ width: PANEL_W }}
          >
            {panel.kind === "service" && !urlDetailSync ? (
              <ServiceRightPanel service={service} onClose={clearOverlayPanel} />
            ) : null}
            {panel.kind === "masking" ? (
              <MaskingPanel cloneName={panel.cloneName} onClose={clearOverlayPanel} />
            ) : null}
            {panel.kind === "branching" ? (
              <BranchingPanel cloneName={panel.cloneName} onClose={clearOverlayPanel} />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
