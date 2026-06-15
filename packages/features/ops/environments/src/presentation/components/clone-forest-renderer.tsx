import type { CSSProperties, ReactNode } from "react";
import { useCallback, useId, useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@guepard/ui/utils";

import {
  CLONE_FOREST_LEVEL_GAP_PX,
  ENVIRONMENTS_CLONE_ROW_GAP_PX,
  environmentsCloneCardWidthPx,
} from "../../environment-clone-canvas-layout";
import { CloneConnectorStripWithToggle } from "./clone-connectors";
import {
  type CloneForestNode,
  reorderCloneForestSiblings,
} from "../../environment-clone-tree";
import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import { CloneForestTimeline } from "./clone-forest-timeline";
import { CloneCard } from "./clone-card";
import type { Service } from "./service-card";
import {
  ENVIRONMENTS_CANVAS_SERVICE_DRAG,
  ENVIRONMENTS_CANVAS_SERVICE_FOCUS,
} from "./environments-services-canvas";

const EMPTY_COLLAPSED_SUBTREES: ReadonlySet<string> = new Set();

export const CF_COLLAPSED_BRANCH_MARKER = "__cf-collapsed__";

export function isCollapsedForestBranchPreviewService(s: Service) {
  return s.id.includes(CF_COLLAPSED_BRANCH_MARKER);
}

function countDescendantRowCards(node: CloneForestNode): number {
  let total = 0;
  for (const ch of node.children) {
    total += 1 + countDescendantRowCards(ch);
  }
  return total;
}

function buildCollapsedBranchPreviewService(
  parent: Service,
  treeId: string,
  descendantRows: number,
): Service {
  const stackTotal = Math.max(2, descendantRows);
  return {
    ...parent,
    id: `${parent.id}${CF_COLLAPSED_BRANCH_MARKER}${treeId}`,
    name: `${descendantRows} clones`,
    cloneUrlIds: undefined,
    mergedCloneStackPreview: { total: stackTotal },
  };
}

type CloneForestRendererProps = {
  roots: CloneForestNode[];
  selectedServiceId: string | null;
  onSelectClone: (s: Service) => void;
  onOpenBranching: (s: Service) => void;
  onOpenMasking: (s: Service) => void;
  onCreateDownstreamClone: (s: Service) => void;
  /** `free` = looser packing and staggered columns (service workspace layout bar). */
  layoutMode?: CanvasCardLayoutMode;
  /** When set with `layoutMode === "grid"`, root columns can be drag-reordered. */
  onReorderRoots?: (next: CloneForestNode[]) => void;
  /** Nodes whose child rows are hidden (connector shows expand control). */
  collapsedSubtreeIds?: ReadonlySet<string>;
  onToggleSubtreeCollapse?: (treeId: string) => void;
  /** DOM id on the primary (source) card — edges from source to each root clone. */
  sourceAnchorId?: string;
};

function CloneForestTimelineWithLinks({
  roots,
  selectedServiceId,
  onSelectClone,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  collapsedSubtreeIds = EMPTY_COLLAPSED_SUBTREES,
  onToggleSubtreeCollapse,
  sourceAnchorId: _sourceAnchorId,
}: CloneForestRendererProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reactId = useId().replace(/:/g, "");
  const getAnchorId = useCallback(
    (treeId: string) => `${reactId}-cfedge-${treeId}`,
    [reactId],
  );

  return (
    <CloneForestArrowShell
      sortableRoots={false}
      sensors={sensors}
      onDragEnd={() => {}}
      rootIds={[]}
    >
      <CloneForestTimeline
        roots={roots}
        selectedServiceId={selectedServiceId}
        onSelectClone={onSelectClone}
        onOpenBranching={onOpenBranching}
        onOpenMasking={onOpenMasking}
        onCreateDownstreamClone={onCreateDownstreamClone}
        collapsedSubtreeIds={collapsedSubtreeIds}
        onToggleSubtreeCollapse={onToggleSubtreeCollapse}
        getAnchorId={getAnchorId}
      />
    </CloneForestArrowShell>
  );
}

function CloneForestTreeRenderer({
  roots,
  selectedServiceId,
  onSelectClone,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  layoutMode = "grid",
  onReorderRoots,
  collapsedSubtreeIds = EMPTY_COLLAPSED_SUBTREES,
  onToggleSubtreeCollapse,
  sourceAnchorId: _sourceAnchorId,
}: CloneForestRendererProps) {
  const free = layoutMode === "free";
  const sortableRoots =
    Boolean(onReorderRoots) && layoutMode === "grid" && roots.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    if (!onReorderRoots) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = reorderCloneForestSiblings(
      roots,
      String(active.id),
      String(over.id),
    );
    if (next) onReorderRoots(next);
  };

  const rootIds = roots.map((r) => r.treeId);
  const reactId = useId().replace(/:/g, "");
  const getAnchorId = useCallback(
    (treeId: string) => `${reactId}-cfedge-${treeId}`,
    [reactId],
  );
  const inner = (
    <div
      className={cn(
        "flex w-full max-w-full overflow-visible pb-8",
        free
          ? "min-h-[min(60vh,520px)] flex-row flex-wrap content-start justify-start gap-x-16 gap-y-20 px-4 pt-4"
          : "flex-row flex-wrap justify-center px-2",
      )}
      style={free ? undefined : { gap: ENVIRONMENTS_CLONE_ROW_GAP_PX }}
    >
      {roots.map((node, topRootIndex) =>
        sortableRoots ? (
          <SortableCloneForestNode
            key={node.treeId}
            node={node}
            isForestRoot
            topLevelIndex={topRootIndex}
            layoutMode={layoutMode}
            selectedServiceId={selectedServiceId}
            onSelectClone={onSelectClone}
            onOpenBranching={onOpenBranching}
            onOpenMasking={onOpenMasking}
            onCreateDownstreamClone={onCreateDownstreamClone}
            cardAnchorId={getAnchorId(node.treeId)}
            getChildAnchorId={getAnchorId}
            collapsedSubtreeIds={collapsedSubtreeIds}
            onToggleSubtreeCollapse={onToggleSubtreeCollapse}
          />
        ) : (
          <CloneForestColumn
            key={node.treeId}
            node={node}
            isRoot
            topRootIndex={topRootIndex}
            layoutMode={layoutMode}
            selectedServiceId={selectedServiceId}
            onSelectClone={onSelectClone}
            onOpenBranching={onOpenBranching}
            onOpenMasking={onOpenMasking}
            onCreateDownstreamClone={onCreateDownstreamClone}
            cardAnchorId={getAnchorId(node.treeId)}
            getChildAnchorId={getAnchorId}
            collapsedSubtreeIds={collapsedSubtreeIds}
            onToggleSubtreeCollapse={onToggleSubtreeCollapse}
          />
        ),
      )}
    </div>
  );

  return (
    <CloneForestArrowShell
      sortableRoots={sortableRoots}
      sensors={sensors}
      onDragEnd={onDragEnd}
      rootIds={rootIds}
    >
      {inner}
    </CloneForestArrowShell>
  );
}

export function CloneForestRenderer(props: CloneForestRendererProps) {
  if (!props.roots.length) return null;
  if (props.layoutMode === "timeline") {
    return <CloneForestTimelineWithLinks {...props} />;
  }
  return <CloneForestTreeRenderer {...props} />;
}

function CloneForestArrowShell({
  sortableRoots,
  sensors,
  onDragEnd,
  rootIds,
  children,
}: {
  sortableRoots: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  rootIds: string[];
  children: ReactNode;
}) {
  return (
    <div className="relative z-0 w-full min-w-0 overflow-visible pb-4">
      {sortableRoots ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={rootIds} strategy={rectSortingStrategy}>
            {children}
          </SortableContext>
        </DndContext>
      ) : (
        children
      )}
    </div>
  );
}

/** Sortable handle is only the card; children stay out of the transformed box so each level drags alone. */
function SortableCloneForestNode({
  node,
  isForestRoot,
  topLevelIndex,
  layoutMode,
  selectedServiceId,
  onSelectClone,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  cardAnchorId,
  getChildAnchorId,
  collapsedSubtreeIds,
  onToggleSubtreeCollapse,
}: {
  node: CloneForestNode;
  /** Top-level column in the forest (stagger in free layout). */
  isForestRoot?: boolean;
  topLevelIndex: number;
  layoutMode: CanvasCardLayoutMode;
  selectedServiceId: string | null;
  onSelectClone: (s: Service) => void;
  onOpenBranching: (s: Service) => void;
  onOpenMasking: (s: Service) => void;
  onCreateDownstreamClone: (s: Service) => void;
  cardAnchorId: string;
  getChildAnchorId: (treeId: string) => string;
  collapsedSubtreeIds: ReadonlySet<string>;
  onToggleSubtreeCollapse?: (treeId: string) => void;
}) {
  const row = node.rowService;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.treeId });

  const selected = selectedServiceId != null && selectedServiceId === row.id;
  const hasChildren = node.children.length > 0;
  const free = layoutMode === "free";
  const rootStagger =
    free && isForestRoot ? (topLevelIndex % 6) * 28 : 0;

  const handleStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 28 : undefined,
  };

  const childIds = node.children.map((c) => c.treeId);
  const multiChildBranch = hasChildren && node.children.length > 1;
  const subtreeCollapsed =
    Boolean(onToggleSubtreeCollapse) &&
    multiChildBranch &&
    collapsedSubtreeIds.has(node.treeId);
  const showBranchChrome = Boolean(onToggleSubtreeCollapse) && multiChildBranch;

  const collapsedPreviewService = useMemo(() => {
    if (!subtreeCollapsed) return null;
    return buildCollapsedBranchPreviewService(
      row,
      node.treeId,
      countDescendantRowCards(node),
    );
  }, [subtreeCollapsed, row, node]);

  return (
    <div
      className="flex flex-col items-center"
      style={{
        ...(rootStagger ? { marginTop: rootStagger } : {}),
        ...(hasChildren ? { gap: CLONE_FOREST_LEVEL_GAP_PX } : {}),
      }}
    >
      <div
        id={cardAnchorId}
        ref={setNodeRef}
        style={handleStyle}
        className="relative z-[3] shrink-0 cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
        {...{
          [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
          [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]: row.id,
        }}
      >
        <CloneCard
          service={row}
          stacked={false}
          selected={selected}
          onClick={() => onSelectClone(row)}
          onOpenBranching={() => onOpenBranching(row)}
          onOpenMasking={() => onOpenMasking(row)}
          onCreateDownstreamClone={() => onCreateDownstreamClone(row)}
          branchingButtonVisibility="hover"
        />
      </div>
      {hasChildren && multiChildBranch ? (
        <div
          className="flex w-full flex-col items-center"
          style={{ gap: CLONE_FOREST_LEVEL_GAP_PX }}
        >
          {showBranchChrome ? (
            <CloneConnectorStripWithToggle
              cols={node.children.length}
              cardWidthPx={environmentsCloneCardWidthPx(row.type)}
              collapsed={subtreeCollapsed}
              showToggle
              onToggle={() => onToggleSubtreeCollapse?.(node.treeId)}
            />
          ) : null}
          {subtreeCollapsed && collapsedPreviewService ? (
            <div
              className="flex justify-center px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="shrink-0"
                {...{
                  [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
                  [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]:
                    collapsedPreviewService.id,
                }}
              >
                <CloneCard
                  service={collapsedPreviewService}
                  stacked={false}
                  selected={false}
                  onClick={() => onToggleSubtreeCollapse?.(node.treeId)}
                  branchingButtonVisibility="hover"
                />
              </div>
            </div>
          ) : !subtreeCollapsed ? (
            <SortableContext items={childIds} strategy={rectSortingStrategy}>
              <div
                className={cn(
                  "flex w-full flex-row flex-wrap justify-center",
                  free && "justify-start gap-x-10 gap-y-6",
                )}
                style={
                  free ? undefined : { gap: ENVIRONMENTS_CLONE_ROW_GAP_PX }
                }
              >
                {node.children.map((ch) => (
                  <SortableCloneForestNode
                    key={ch.treeId}
                    node={ch}
                    topLevelIndex={0}
                    layoutMode={layoutMode}
                    selectedServiceId={selectedServiceId}
                    onSelectClone={onSelectClone}
                    onOpenBranching={onOpenBranching}
                    onOpenMasking={onOpenMasking}
                    onCreateDownstreamClone={onCreateDownstreamClone}
                    cardAnchorId={getChildAnchorId(ch.treeId)}
                    getChildAnchorId={getChildAnchorId}
                    collapsedSubtreeIds={collapsedSubtreeIds}
                    onToggleSubtreeCollapse={onToggleSubtreeCollapse}
                  />
                ))}
              </div>
            </SortableContext>
          ) : null}
        </div>
      ) : hasChildren ? (
        <div
          className={cn(
            "flex w-full flex-row flex-wrap justify-center",
            free && "justify-start gap-x-10 gap-y-6",
          )}
          style={free ? undefined : { gap: ENVIRONMENTS_CLONE_ROW_GAP_PX }}
        >
          {node.children.map((ch) => (
            <SortableCloneForestNode
              key={ch.treeId}
              node={ch}
              topLevelIndex={0}
              layoutMode={layoutMode}
              selectedServiceId={selectedServiceId}
              onSelectClone={onSelectClone}
              onOpenBranching={onOpenBranching}
              onOpenMasking={onOpenMasking}
              onCreateDownstreamClone={onCreateDownstreamClone}
              cardAnchorId={getChildAnchorId(ch.treeId)}
              getChildAnchorId={getChildAnchorId}
              collapsedSubtreeIds={collapsedSubtreeIds}
              onToggleSubtreeCollapse={onToggleSubtreeCollapse}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CloneForestColumn({
  node,
  isRoot,
  topRootIndex = 0,
  layoutMode,
  selectedServiceId,
  onSelectClone,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  cardAnchorId,
  getChildAnchorId,
  collapsedSubtreeIds,
  onToggleSubtreeCollapse,
}: {
  node: CloneForestNode;
  isRoot: boolean;
  topRootIndex?: number;
  layoutMode: CanvasCardLayoutMode;
  selectedServiceId: string | null;
  onSelectClone: (s: Service) => void;
  onOpenBranching: (s: Service) => void;
  onOpenMasking: (s: Service) => void;
  onCreateDownstreamClone: (s: Service) => void;
  cardAnchorId: string;
  getChildAnchorId: (treeId: string) => string;
  collapsedSubtreeIds: ReadonlySet<string>;
  onToggleSubtreeCollapse?: (treeId: string) => void;
}) {
  const row = node.rowService;
  const selected = selectedServiceId != null && selectedServiceId === row.id;
  const hasChildren = node.children.length > 0;
  const free = layoutMode === "free";
  const rootStagger =
    free && isRoot ? (topRootIndex % 6) * 28 : 0;
  const multiChildBranch = hasChildren && node.children.length > 1;
  const subtreeCollapsed =
    Boolean(onToggleSubtreeCollapse) &&
    multiChildBranch &&
    collapsedSubtreeIds.has(node.treeId);
  const showBranchChrome = Boolean(onToggleSubtreeCollapse) && multiChildBranch;

  const collapsedPreviewService = useMemo(() => {
    if (!subtreeCollapsed) return null;
    return buildCollapsedBranchPreviewService(
      row,
      node.treeId,
      countDescendantRowCards(node),
    );
  }, [subtreeCollapsed, row, node]);

  return (
    <div
      className="flex flex-col items-center"
      style={{
        ...(rootStagger ? { marginTop: rootStagger } : {}),
        ...(hasChildren ? { gap: CLONE_FOREST_LEVEL_GAP_PX } : {}),
      }}
    >
      <div
        id={cardAnchorId}
        className="relative z-[3] shrink-0"
        {...{
          [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
          [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]: row.id,
        }}
      >
        <CloneCard
          service={row}
          stacked={false}
          selected={selected}
          onClick={() => onSelectClone(row)}
          onOpenBranching={() => onOpenBranching(row)}
          onOpenMasking={() => onOpenMasking(row)}
          onCreateDownstreamClone={() => onCreateDownstreamClone(row)}
          branchingButtonVisibility="hover"
        />
      </div>
      {hasChildren && multiChildBranch ? (
        <div
          className="flex w-full flex-col items-center"
          style={{ gap: CLONE_FOREST_LEVEL_GAP_PX }}
        >
          {showBranchChrome ? (
            <CloneConnectorStripWithToggle
              cols={node.children.length}
              cardWidthPx={environmentsCloneCardWidthPx(row.type)}
              collapsed={subtreeCollapsed}
              showToggle
              onToggle={() => onToggleSubtreeCollapse?.(node.treeId)}
            />
          ) : null}
          {subtreeCollapsed && collapsedPreviewService ? (
            <div
              className="flex justify-center px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="shrink-0"
                {...{
                  [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
                  [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]:
                    collapsedPreviewService.id,
                }}
              >
                <CloneCard
                  service={collapsedPreviewService}
                  stacked={false}
                  selected={false}
                  onClick={() => onToggleSubtreeCollapse?.(node.treeId)}
                  branchingButtonVisibility="hover"
                />
              </div>
            </div>
          ) : !subtreeCollapsed ? (
            <div
              className={cn(
                "flex w-full flex-row flex-wrap justify-center",
                free && "justify-start gap-x-10 gap-y-6",
              )}
              style={
                free ? undefined : { gap: ENVIRONMENTS_CLONE_ROW_GAP_PX }
              }
            >
              {node.children.map((ch) => (
                <CloneForestColumn
                  key={ch.treeId}
                  node={ch}
                  isRoot={false}
                  layoutMode={layoutMode}
                  selectedServiceId={selectedServiceId}
                  onSelectClone={onSelectClone}
                  onOpenBranching={onOpenBranching}
                  onOpenMasking={onOpenMasking}
                  onCreateDownstreamClone={onCreateDownstreamClone}
                  cardAnchorId={getChildAnchorId(ch.treeId)}
                  getChildAnchorId={getChildAnchorId}
                  collapsedSubtreeIds={collapsedSubtreeIds}
                  onToggleSubtreeCollapse={onToggleSubtreeCollapse}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : hasChildren ? (
        <div
          className={cn(
            "flex w-full flex-row flex-wrap justify-center",
            free && "justify-start gap-x-10 gap-y-6",
          )}
          style={free ? undefined : { gap: ENVIRONMENTS_CLONE_ROW_GAP_PX }}
        >
          {node.children.map((ch) => (
            <CloneForestColumn
              key={ch.treeId}
              node={ch}
              isRoot={false}
              layoutMode={layoutMode}
              selectedServiceId={selectedServiceId}
              onSelectClone={onSelectClone}
              onOpenBranching={onOpenBranching}
              onOpenMasking={onOpenMasking}
              onCreateDownstreamClone={onCreateDownstreamClone}
              cardAnchorId={getChildAnchorId(ch.treeId)}
              getChildAnchorId={getChildAnchorId}
              collapsedSubtreeIds={collapsedSubtreeIds}
              onToggleSubtreeCollapse={onToggleSubtreeCollapse}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
