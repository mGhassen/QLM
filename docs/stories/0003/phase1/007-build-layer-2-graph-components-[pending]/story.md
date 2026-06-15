---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#322-layer-2--per-source-graph-layer2view"
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
status: pending
started: null
finished: null
blocks:
  - "009-compose-layer-2-with-fixture-transitions"
blocked_by:
  - "002-define-display-types-and-fixtures"
  - "003-seed-environments-i18n-namespace"
---

# Build layer 2 graph components

## Goal

Ship every Layer 2 graph element (`GraphSourceNode`, `GraphVolumeNode`, `GraphCloneNode`, `GraphBranchChipStrip`, `GraphConnectors`, `EnvironmentsCanvasDotGrid`) and the `LifecycleEventAxis`, each with Storybook stories, so Story 009 can compose them into a full `Layer2View`.

## Scope

**In scope**

- `src/components/graph/environments-canvas-dot-grid.tsx` — the background pattern. Port of the POC 16-LOC file (`/Users/hani.chalouati/Documents/work/guepard/mock-v3/packages/features/project-layer/ops/environments/src/presentation/components/environments-workspace/environments-canvas-dot-grid.tsx`), re-implemented with Tailwind tokens.
- `src/components/graph/graph-source-node.tsx` — the bolder source node at the top of the Layer 2 tree. Visual reference: POC `service-tree-view.tsx` lines 683–752.
- `src/components/graph/graph-volume-node.tsx` — compact volume row rendered only when `graph.volume` is non-null. Collapsed otherwise.
- `src/components/graph/graph-clone-node.tsx` — the clone card. Visual reference: POC `service-tree-view.tsx` lines 53–97 (`CloneNode`), **minus the "Live replication" chip** (phase-2 scope, deferred per spec §13). Phase-1 shape: clone name + status dot + "Create branch" button.
- `src/components/graph/graph-branch-chip-strip.tsx` — horizontal strip of up to 4 branch chips + a `+N` overflow chip. Click on a chip emits a `GraphSelection` of kind `branch`.
- `src/components/graph/graph-connectors.tsx` — hand-rolled SVG `<Connectors />` component. Draws the trunk from the source down, the horizontal span across clones, and the drops to each clone. Layout math ported from POC `service-tree-view.tsx` lines 174–203.
- `src/components/graph/graph.stories.tsx` — one story per element (source node, volume node, clone node, branch chip strip, connectors) plus an **aggregated composition** story that assembles them for a fixture source (no inspector panel in this story — that's Story 009).
- `src/components/lifecycle-event-axis.tsx` + `lifecycle-event-axis.stories.tsx` + `lifecycle-event-axis.test.tsx`
  - Horizontal time axis anchored to the bottom of a container.
  - One tick per `LifecycleEvent` in the input array.
  - Tooltip on tick hover: event type label (from `environments.events.*`) + timestamp.
  - Stories: Empty / Few events / Dense events (all 6 event types represented).
- Colocated tests for components with branching logic: branch chip strip overflow, graph-volume-node conditional render, connectors math for 1 / 2 / 3 clone columns.

**Out of scope** (forces honest slicing)

- `Layer2View` composition (→ Story 009)
- The contextual inspector (→ Story 008)
- Fixture state transitions when "Clone to node" / "Create branch" is clicked (→ Story 009)
- Horizontal dashed clone-to-clone replication links (deferred per spec §3.4 to phase 2 — **do not port** POC `HorizCloneLink`)
- Context menus on nodes (POC `ContextMenu` is out of scope per spec §13)
- Infra footer (POC `InfraFooter` is out of scope per spec §13)

## Acceptance criteria

- [ ] Each graph element has its own Storybook story: `GraphSourceNode`, `GraphVolumeNode`, `GraphCloneNode`, `GraphBranchChipStrip`, `GraphConnectors`, `EnvironmentsCanvasDotGrid`, `LifecycleEventAxis`.
- [ ] An aggregated "Graph composition" story renders source → volume → 2 clones → branch chips for a fixture source, using real fixture data from Story 002.
- [ ] `GraphConnectors` draws: trunk from source → volume, volume → horizontal span, horizontal span → drops to each clone. Visible in the composition story for 1, 2, and 3 clones.
- [ ] `GraphCloneNode` does **not** render the "Live replication" chip. Phase-1 scope shows name + status + "Create branch" button only.
- [ ] `GraphBranchChipStrip` overflows gracefully: a strip with 5 fixture branches shows 4 chips + a `+1` overflow chip. Unit test covers 0, 1, 4, 5, 10 branches.
- [ ] `GraphVolumeNode` is absent from the graph when `graph.volume` is `null`; the source then connects directly to the clone row. Unit test covers both branches.
- [ ] `LifecycleEventAxis` renders ticks for all 6 event types and each tick's tooltip localizes via `environments.events.*`.
- [ ] No hardcoded English strings in any new file.
- [ ] `pnpm --filter @guepard/environments storybook` serves every new story without errors.
- [ ] `pnpm --filter @guepard/environments test` passes with coverage on the new files.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
pnpm --filter @guepard/environments storybook
# Browse: Environments/Graph/SourceNode
# Browse: Environments/Graph/CloneNode
# Browse: Environments/Graph/BranchChipStrip (overflow variant)
# Browse: Environments/Graph/Connectors/{1 clone, 2 clones, 3 clones}
# Browse: Environments/Graph/Composition (aggregated)
# Browse: Environments/LifecycleEventAxis/{Empty, Few, Dense}

pnpm --filter @guepard/environments test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
