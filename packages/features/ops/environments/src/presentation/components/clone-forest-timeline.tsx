import { useMemo } from "react";
import { cn } from "@guepard/ui/utils";

import { environmentsCloneCardWidthPx } from "../../environment-clone-canvas-layout";
import type { CloneForestNode } from "../../environment-clone-tree";
import { CloneCard } from "./clone-card";
import type { Service } from "./service-card";
import {
  ENVIRONMENTS_CANVAS_SERVICE_DRAG,
  ENVIRONMENTS_CANVAS_SERVICE_FOCUS,
} from "./environments-services-canvas";
import { EnvironmentsCanvasDotGrid } from "./environments-canvas-dot-grid";

const CF_COLLAPSED_BRANCH_MARKER = "__cf-collapsed__";

function isCollapsedForestBranchPreviewService(s: Service) {
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

export type TimelineColumnEntry = { treeId: string; service: Service };

function flatTimelineEntries(
  node: CloneForestNode,
  collapsedSubtreeIds: ReadonlySet<string>,
): TimelineColumnEntry[] {
  const multiChild = node.children.length > 1;
  const collapsedHere =
    collapsedSubtreeIds.has(node.treeId) && multiChild;
  if (collapsedHere) {
    return [
      {
        treeId: node.treeId,
        service: buildCollapsedBranchPreviewService(
          node.rowService,
          node.treeId,
          countDescendantRowCards(node),
        ),
      },
    ];
  }
  const out: TimelineColumnEntry[] = [
    { treeId: node.treeId, service: node.rowService },
  ];
  for (const ch of node.children) {
    out.push(...flatTimelineEntries(ch, collapsedSubtreeIds));
  }
  return out;
}

function mockCheckpointLabel(index: number, row: Service): {
  when: string;
  hash: string;
} {
  const base = new Date("2026-04-03T11:47:00");
  const d = new Date(base.getTime() + index * 5 * 60 * 60 * 1000);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const uid = row.urlId ?? index + 9900;
  const hash = `${uid.toString(16)}${row.name.replace(/\s/g, "").slice(0, 4)}`;
  return {
    when: `${dd}/${mm}/${yyyy} ${hh}h${min}`,
    hash: `#${hash}`,
  };
}

const CHECKPOINT_MIN_W = 200;
const STACK_OFFSET = 14;

export function cloneForestTimelineMinWidthPx(roots: CloneForestNode[]): number {
  if (!roots.length) return 0;
  return 56 + roots.length * Math.max(CHECKPOINT_MIN_W, 196);
}

export function CloneForestTimeline({
  roots,
  selectedServiceId,
  onSelectClone,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  collapsedSubtreeIds,
  onToggleSubtreeCollapse,
  getAnchorId,
}: {
  roots: CloneForestNode[];
  selectedServiceId: string | null;
  onSelectClone: (s: Service) => void;
  onOpenBranching: (s: Service) => void;
  onOpenMasking: (s: Service) => void;
  onCreateDownstreamClone: (s: Service) => void;
  collapsedSubtreeIds: ReadonlySet<string>;
  onToggleSubtreeCollapse?: (treeId: string) => void;
  getAnchorId: (treeId: string) => string;
}) {
  const columns = useMemo(
    () =>
      roots.map((root, index) => ({
        columnKey: root.treeId,
        label: mockCheckpointLabel(index, root.rowService),
        entries: flatTimelineEntries(root, collapsedSubtreeIds),
      })),
    [roots, collapsedSubtreeIds],
  );

  const cardW = roots[0]
    ? environmentsCloneCardWidthPx(roots[0].rowService.type)
    : environmentsCloneCardWidthPx("postgres");

  return (
    <div
      className="relative z-0 w-full min-w-0 overflow-visible px-6 pb-10 pt-4"
      style={{ minWidth: cloneForestTimelineMinWidthPx(roots) }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg border border-border/40 bg-muted/20">
        <EnvironmentsCanvasDotGrid />
      </div>

      <div className="relative flex min-h-[min(52vh,560px)] flex-col justify-end">
        <div
          className="pointer-events-none absolute left-8 right-8 top-[42%] h-0 border-t-[3px] border-chart-2/70"
          aria-hidden
        />
        <div
          className="relative flex flex-row flex-nowrap items-end justify-center px-2"
          style={{ gap: Math.max(12, 28 - roots.length * 2) }}
        >
          {columns.map((col) => (
            <div
              key={col.columnKey}
              className="relative flex shrink-0 flex-col items-center"
              style={{
                width: Math.max(CHECKPOINT_MIN_W, cardW + 28),
              }}
            >
              <div className="z-[2] mb-1 flex min-h-[40px] flex-col items-center justify-end text-center">
                <div className="font-mono text-[10px] leading-tight text-foreground">
                  {col.label.when}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {col.label.hash}
                </div>
              </div>
              <div
                className="z-[2] mb-0 h-6 w-px shrink-0 bg-foreground/80"
                aria-hidden
              />
              <div
                className="relative z-[3] flex flex-col items-center"
                style={{
                  width: cardW + 32,
                  minHeight: col.entries.length * STACK_OFFSET + 120,
                }}
              >
                {col.entries.map((entry, stackIndex) => {
                  const { treeId, service: row } = entry;
                  const selected = selectedServiceId === row.id;
                  const previewCollapsed =
                    isCollapsedForestBranchPreviewService(row);
                  return (
                    <div
                      key={`${treeId}-${row.id}-${stackIndex}`}
                      id={getAnchorId(treeId)}
                      className={cn(
                        "absolute left-1/2 w-max -translate-x-1/2",
                        !previewCollapsed && "cursor-default",
                      )}
                      style={{
                        bottom: stackIndex * STACK_OFFSET,
                        zIndex: 10 + stackIndex,
                      }}
                      {...{
                        [ENVIRONMENTS_CANVAS_SERVICE_DRAG]: "",
                        [ENVIRONMENTS_CANVAS_SERVICE_FOCUS]: row.id,
                      }}
                    >
                      <CloneCard
                        service={row}
                        stacked={col.entries.length > 1}
                        selected={selected}
                        onClick={() => {
                          if (previewCollapsed && onToggleSubtreeCollapse) {
                            onToggleSubtreeCollapse(treeId);
                            return;
                          }
                          onSelectClone(row);
                        }}
                        onOpenBranching={() => onOpenBranching(row)}
                        onOpenMasking={() => onOpenMasking(row)}
                        onCreateDownstreamClone={() =>
                          onCreateDownstreamClone(row)
                        }
                        branchingButtonVisibility="hover"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
