import {
  ENVIRONMENTS_CLONE_ROW_GAP_PX,
  environmentsCloneCardWidthPx,
} from "../../../environment-clone-canvas-layout";
import type { CloneForestNode } from "../../../environment-clone-tree";
import type { Service } from "../service-card";

/**
 * Nominal clone card height for RF **layout** (positions / sheet). Real nodes are resized from
 * paint in `EnvCloneCardNode`; keep this close to typical measured height to avoid huge gaps.
 */
export const ENV_RF_CARD_HEIGHT_PX = 276;

/** Matches `MERGED_STACK_TOP_PAD` in clone-card (front face starts below stacked “backs”). */
export const ENV_RF_MERGED_STACK_TOP_PAD_PX = 42;

/** XYFlow `<Handle id>` — reference from workspace edges (`sourceHandle` / `targetHandle`). */
export const ENV_RF_CLONE_HANDLE_SOURCE_OUT = "envRfSourceOut";
export const ENV_RF_CLONE_HANDLE_TARGET_IN = "envRfTargetIn";

/**
 * Merged “N clones” aggregate: top pad + front face without masking footer.
 * Keep in sync with CloneCard merged-stack layout.
 */
export const ENV_RF_MERGED_STACK_CARD_HEIGHT_PX =
  ENV_RF_MERGED_STACK_TOP_PAD_PX + 248;

/** Workspace primary row: collapse control sits below the card baseline. */
export const ENV_RF_SOURCE_WITH_MERGE_STRIP_HEIGHT_PX =
  ENV_RF_CARD_HEIGHT_PX + 28;

/** Vertical gap between workspace primary bottom and first clone row (RF). */
export const ENV_RF_SOURCE_TO_ROW_GAP_PX = 28;

/** RF forest: padding above/below the vertical connector run between card rows. */
const ENV_RF_FOREST_GAP_PX = 22;

/** Legacy connector strip allowance between forest levels (RF layout only). */
const CONNECTOR_STRIP_H = 28;

export const FREE_CARD_MAX_W = 260;
export const FREE_CARD_MAX_H = 340;

export function gridLayoutColumnCount(total: number): number {
  const n = Math.max(1, total);
  return Math.max(3, Math.ceil(Math.sqrt(n * 1.5)));
}

export function defaultCanvasFreePosition(
  index: number,
  total: number = 1,
): { x: number; y: number } {
  const n = Math.max(1, total);
  const cols = gridLayoutColumnCount(n);
  const cellX = 288;
  const cellY = 248;
  return { x: 72 + (index % cols) * cellX, y: 72 + Math.floor(index / cols) * cellY };
}

function gridPackMaxWidthPx(serviceCount: number): number {
  const cols = gridLayoutColumnCount(serviceCount);
  const gapPx = 32;
  return cols * FREE_CARD_MAX_W + (cols - 1) * gapPx + 64;
}

export function computeGridPositions(
  services: Service[],
  cardRole: "service" | "clone",
): { positions: Map<string, { x: number; y: number }>; packWidth: number } {
  const positions = new Map<string, { x: number; y: number }>();
  const n = services.length;
  if (n === 0) {
    return { positions, packWidth: gridPackMaxWidthPx(1) };
  }
  const gap = cardRole === "clone" ? ENVIRONMENTS_CLONE_ROW_GAP_PX : 32;
  const packWidth =
    cardRole === "clone"
      ? (() => {
          const w = environmentsCloneCardWidthPx(services[0]!.type);
          return n * w + (n - 1) * gap + 128;
        })()
      : gridPackMaxWidthPx(n);

  let x = 32;
  const y = cardRole === "clone" ? 24 : 72;
  for (const s of services) {
    const w =
      cardRole === "clone"
        ? environmentsCloneCardWidthPx(s.type)
        : FREE_CARD_MAX_W;
    positions.set(s.id, { x, y });
    x += w + gap;
  }
  const used = x - gap + 32;
  const centeredOffset = Math.max(0, (packWidth - used) / 2);
  if (centeredOffset > 0) {
    for (const s of services) {
      const p = positions.get(s.id)!;
      positions.set(s.id, { x: p.x + centeredOffset, y: p.y });
    }
  }
  return { positions, packWidth };
}

export function computeSheetExtentForGrid(
  services: Service[],
  cardLayoutMode: "grid" | "free" | "timeline",
  isFreeLayout: boolean,
): { w: number; h: number } {
  const SHEET_CONTENT_PAD_PX = 4000;
  const SHEET_MIN_DIM_PX = 10_000;
  const pad = SHEET_CONTENT_PAD_PX;
  const minDim = SHEET_MIN_DIM_PX;
  if (isFreeLayout) {
    const b = computeFreeServicesClusterBounds(services);
    return {
      w: Math.max(minDim, b.maxX + pad, FREE_CARD_MAX_W + pad * 2),
      h: Math.max(minDim, b.maxY + pad, FREE_CARD_MAX_H + pad * 2),
    };
  }
  const count = Math.max(1, services.length);
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * 2)));
  const rows = Math.ceil(count / cols);
  const cellX = 320;
  const cellY = 420;
  return {
    w: Math.max(minDim, cols * cellX + pad * 2),
    h: Math.max(minDim, rows * cellY + pad * 2),
  };
}

function computeFreeServicesClusterBounds(services: Service[]) {
  const total = services.length;
  if (total === 0) {
    return { minX: 0, minY: 0, maxX: FREE_CARD_MAX_W, maxY: FREE_CARD_MAX_H };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < total; i++) {
    const s = services[i]!;
    const pos = defaultCanvasFreePosition(i, total);
    const x = s.x ?? pos.x;
    const y = s.y ?? pos.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + FREE_CARD_MAX_W);
    maxY = Math.max(maxY, y + FREE_CARD_MAX_H);
  }
  return { minX, minY, maxX, maxY };
}

export type ForestLayoutEntry = {
  treeId: string;
  x: number;
  y: number;
  width: number;
  service: Service;
  isCollapsedPreview: boolean;
  /** When set, render collapse toggle handle between this node and its children. */
  branchToggleAfter?: boolean;
};

const CF_COLLAPSED_PREVIEW = "__cf-collapsed__";

function isCollapsedPreviewService(s: Service) {
  return s.id.includes(CF_COLLAPSED_PREVIEW);
}

function cardWidth(s: Service) {
  return environmentsCloneCardWidthPx(s.type);
}

type SubtreeBox = { minX: number; maxX: number; entries: ForestLayoutEntry[] };

function shiftEntries(entries: ForestLayoutEntry[], dx: number): ForestLayoutEntry[] {
  return entries.map((e) => ({ ...e, x: e.x + dx }));
}

function layoutForestNode(
  node: CloneForestNode,
  collapsedSubtreeIds: ReadonlySet<string>,
  showBranchToggle: boolean,
  y: number,
): SubtreeBox {
  const w = cardWidth(node.rowService);
  const hasChildren = node.children.length > 0;
  const multi = node.children.length > 1;
  const subtreeCollapsed =
    showBranchToggle && multi && collapsedSubtreeIds.has(node.treeId);

  if (!hasChildren) {
    const entries: ForestLayoutEntry[] = [
      {
        treeId: node.treeId,
        x: 0,
        y,
        width: w,
        service: node.rowService,
        isCollapsedPreview: false,
      },
    ];
    return { minX: 0, maxX: w, entries };
  }

  if (subtreeCollapsed) {
    const descendantCount = countDescendantCards(node);
    const preview = buildCollapsedPreviewService(node.rowService, node.treeId, descendantCount);
    const childY =
      y + ENV_RF_CARD_HEIGHT_PX + ENV_RF_FOREST_GAP_PX + CONNECTOR_STRIP_H;
    const entries: ForestLayoutEntry[] = [
      {
        treeId: node.treeId,
        x: 0,
        y,
        width: w,
        service: node.rowService,
        isCollapsedPreview: false,
        branchToggleAfter: true,
      },
      {
        treeId: `${node.treeId}__preview`,
        x: 0,
        y: childY,
        width: w,
        service: preview,
        isCollapsedPreview: true,
      },
    ];
    return { minX: 0, maxX: w, entries };
  }

  const childY =
    y +
    ENV_RF_CARD_HEIGHT_PX +
    ENV_RF_FOREST_GAP_PX +
    CONNECTOR_STRIP_H +
    ENV_RF_FOREST_GAP_PX;

  if (node.children.length === 1) {
    const ch = node.children[0]!;
    const childBox = layoutForestNode(ch, collapsedSubtreeIds, showBranchToggle, childY);
    const childCenter = (childBox.minX + childBox.maxX) / 2;
    const parentX = childCenter - w / 2;
    const entries: ForestLayoutEntry[] = [
      {
        treeId: node.treeId,
        x: parentX,
        y,
        width: w,
        service: node.rowService,
        isCollapsedPreview: false,
        branchToggleAfter: false,
      },
      ...childBox.entries,
    ];
    return {
      minX: Math.min(parentX, childBox.minX),
      maxX: Math.max(parentX + w, childBox.maxX),
      entries,
    };
  }

  let cursor = 0;
  const mergedChildEntries: ForestLayoutEntry[] = [];
  let rowMinX = Infinity;
  let rowMaxX = -Infinity;
  for (const ch of node.children) {
    const box = layoutForestNode(ch, collapsedSubtreeIds, showBranchToggle, childY);
    const dx = cursor - box.minX;
    const shifted = shiftEntries(box.entries, dx);
    mergedChildEntries.push(...shifted);
    rowMinX = Math.min(rowMinX, box.minX + dx);
    rowMaxX = Math.max(rowMaxX, box.maxX + dx);
    cursor = box.maxX + dx + ENVIRONMENTS_CLONE_ROW_GAP_PX;
  }
  const rowCenter = (rowMinX + rowMaxX) / 2;
  const parentX = rowCenter - w / 2;
  const entries: ForestLayoutEntry[] = [
    {
      treeId: node.treeId,
      x: parentX,
      y,
      width: w,
      service: node.rowService,
      isCollapsedPreview: false,
      branchToggleAfter: showBranchToggle && multi,
    },
    ...mergedChildEntries,
  ];
  return {
    minX: Math.min(parentX, rowMinX),
    maxX: Math.max(parentX + w, rowMaxX),
    entries,
  };
}

function countDescendantCards(node: CloneForestNode): number {
  let t = 0;
  for (const ch of node.children) {
    t += 1 + countDescendantCards(ch);
  }
  return t;
}

function buildCollapsedPreviewService(
  parent: Service,
  treeId: string,
  descendantRows: number,
): Service {
  const stackTotal = Math.max(2, descendantRows);
  return {
    ...parent,
    id: `${parent.id}${CF_COLLAPSED_PREVIEW}${treeId}`,
    name: `${descendantRows} clones`,
    cloneUrlIds: undefined,
    mergedCloneStackPreview: { total: stackTotal },
  };
}

export function layoutCloneForestGrid(
  roots: CloneForestNode[],
  collapsedSubtreeIds: ReadonlySet<string>,
  showBranchToggle: boolean,
  freeStagger: boolean,
): ForestLayoutEntry[] {
  if (!roots.length) return [];
  let cursorX = 0;
  const all: ForestLayoutEntry[] = [];
  const y0 = 0;
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i]!;
    const stagger = freeStagger ? (i % 6) * 28 : 0;
    const box = layoutForestNode(
      root,
      collapsedSubtreeIds,
      showBranchToggle,
      y0 + stagger,
    );
    const dx = cursorX - box.minX;
    all.push(...shiftEntries(box.entries, dx));
    cursorX = box.maxX + dx + ENVIRONMENTS_CLONE_ROW_GAP_PX * 2;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const e of all) {
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x + e.width);
  }
  const centerShift = -(minX + maxX) / 2;
  return all.map((e) => ({ ...e, x: e.x + centerShift }));
}

export function layoutTimelineForest(
  roots: CloneForestNode[],
  collapsedSubtreeIds: ReadonlySet<string>,
): ForestLayoutEntry[] {
  const CHECKPOINT_MIN_W = 200;
  const STACK_OFFSET = 14;
  const out: ForestLayoutEntry[] = [];
  let colX = 0;
  for (const root of roots) {
    const entries = flatTimelineEntries(root, collapsedSubtreeIds);
    const cardW = environmentsCloneCardWidthPx(root.rowService.type);
    const colW = Math.max(CHECKPOINT_MIN_W, cardW + 28);
    const baseX = colX + colW / 2 - cardW / 2;
    let stackIndex = 0;
    for (const { treeId, service } of entries) {
      out.push({
        treeId,
        x: baseX,
        y: stackIndex * STACK_OFFSET,
        width: cardW,
        service,
        isCollapsedPreview: isCollapsedPreviewService(service),
      });
      stackIndex += 1;
    }
    colX += colW + Math.max(12, 28 - roots.length * 2);
  }
  const totalW = colX - Math.max(12, 28 - roots.length * 2);
  const shift = -totalW / 2;
  return out.map((e) => ({ ...e, x: e.x + shift }));
}

function flatTimelineEntries(
  node: CloneForestNode,
  collapsedSubtreeIds: ReadonlySet<string>,
): { treeId: string; service: Service }[] {
  const multiChild = node.children.length > 1;
  const collapsedHere =
    collapsedSubtreeIds.has(node.treeId) && multiChild;
  if (collapsedHere) {
    return [
      {
        treeId: node.treeId,
        service: buildCollapsedPreviewService(
          node.rowService,
          node.treeId,
          countDescendantCards(node),
        ),
      },
    ];
  }
  const row: { treeId: string; service: Service }[] = [
    { treeId: node.treeId, service: node.rowService },
  ];
  for (const ch of node.children) {
    row.push(...flatTimelineEntries(ch, collapsedSubtreeIds));
  }
  return row;
}

export function computeWorkspaceGraphBounds(
  sourceW: number,
  entries: ForestLayoutEntry[],
  mergedOnly: boolean,
  mergedW: number,
  heights?: { sourcePx: number; mergedPx: number },
): { width: number; height: number } {
  const sourceH = heights?.sourcePx ?? ENV_RF_CARD_HEIGHT_PX;
  const mergedH = heights?.mergedPx ?? ENV_RF_CARD_HEIGHT_PX;
  let minX = -sourceW / 2;
  let maxX = sourceW / 2;
  let maxY = sourceH + ENV_RF_SOURCE_TO_ROW_GAP_PX;

  if (mergedOnly) {
    minX = Math.min(minX, -mergedW / 2);
    maxX = Math.max(maxX, mergedW / 2);
    maxY += mergedH + 32;
    return { width: maxX - minX + 400, height: maxY + 400 };
  }

  for (const e of entries) {
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x + e.width);
    maxY = Math.max(maxY, e.y + ENV_RF_CARD_HEIGHT_PX + 120);
  }
  return { width: maxX - minX + 400, height: maxY + 400 };
}
