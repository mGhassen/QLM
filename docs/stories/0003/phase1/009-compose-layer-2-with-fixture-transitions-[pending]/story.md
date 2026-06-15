---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#322-layer-2--per-source-graph-layer2view"
  - "#33-user-flows-happy-paths"
  - "#41-layered-sequence-diagrams"
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
  - "#76-shell-app-packagesappsenvironments"
status: pending
started: null
finished: null
blocks:
  - "010-verify-phase-1-end-to-end"
blocked_by:
  - "006-render-layer-1-catalogue"
  - "007-build-layer-2-graph-components"
  - "008-build-contextual-inspector"
---

# Compose layer 2 with fixture transitions

## Goal

Compose `Layer2View` from the Story-007 graph, the lifecycle axis, and the Story-008 inspector; wire the plugin-root `FlatRoot` export and `resolveProjectContext`; implement `useFixtureEnvironmentGraph` with the fake `cloneToNode` and `createBranch` state transitions so a user can click through the full Layer-2 happy path against fixtures.

## Scope

**In scope**

- `src/components/layer-2-view.tsx` + `layer-2-view.stories.tsx` + `layer-2-view.test.tsx`
  - Composes: `EnvironmentsCanvasDotGrid` background, graph area (`GraphSourceNode` → optional `GraphVolumeNode` → row of `GraphCloneNode[]` + `GraphBranchChipStrip` under each clone, connected by `GraphConnectors`), `LifecycleEventAxis` below the graph, `ContextualInspector` docked right.
  - State: `selectedNode: GraphSelection | null`. Clicking any graph element sets it; clicking empty canvas clears it; Escape clears it.
  - Back-to-catalogue breadcrumb top-left → navigates to `/prj/{slug}/environments`.
  - Props: `{ graph, isLoading, error, onCloneToNode, onCreateBranch, onBack, onRetry }` as `Readonly<Layer2ViewProps>`.
  - Stories: Loading / Empty (0 clones) / Ready (2 clones) / Ready (3 clones) / Error.
- `src/fixtures/use-fixture-environment-graph.ts` — upgrade from Story 002's skeleton into the full fixture adapter:
  - Returns `{ graph, isLoading, error, cloneToNode, createBranch }`.
  - `cloneToNode(sourceId, nodeId)`: synchronously appends a new clone with status `provisioning` and emits a `clone_requested` event, then schedules a transition to `ingesting` after 400 ms and to `healthy` after a further 1200 ms. Uses `setTimeout` (real timers in app, fake timers in tests).
  - `createBranch(cloneId)`: synchronously appends a new `BranchChip` under the clone and emits a `branch_created` event.
  - State lives in React via `useState` — no external store, no network.
- `packages/apps/environments/src/plugin-root.tsx`:
  - Export `FlatRoot`: calls `useFlatRoute()` to read `sourceSlug`, calls `useFixtureEnvironmentGraph(sourceSlug)`, renders `<Layer2View />` with all callbacks wired.
  - Export `resolveProjectContext(params, api)`: reads the fixture source by slug from `@qlm/environments/fixtures` and returns `{ projectId }`. Returns `null` for unknown slugs.
- `apps/web/src/config/paths.config.ts`: add `createEnvironmentFlatPath(sourceSlug: string)` helper returning `/env/${sourceSlug}`.
- Verify the flat route `/env/{sourceSlug}` works via the existing catch-all — no new route file in `apps/web/src/routes/` expected.
- Integration test: fake-timer Vitest test for `use-fixture-environment-graph.ts` asserting the cloneToNode transition fires at t=0 (provisioning), t=400 (ingesting), t=1600 (healthy).
- Integration test: component test mounting `Layer2View` with the fixture adapter hook, clicking "Clone to node", advancing timers, asserting the new clone's status transitions.

**Out of scope** (forces honest slicing)

- Any real network call — phase 1 is fixture-only.
- Replication-status chips / masking / branch history panel — deferred.
- Accessibility polish (keyboard navigation refinements, focus return) (→ Story 010).
- Playwright smoke (→ Story 010).
- Manual smoke checklist execution (→ Story 010).

## Acceptance criteria

- [ ] `Layer2View` composes graph + axis + inspector and renders correctly in every state (Loading / Empty / Ready / Error) — verified by Storybook stories and by running `pnpm web:dev`.
- [ ] Clicking any graph node (source / volume / clone / branch) opens the `ContextualInspector` with the correct slot set. Clicking empty canvas closes it. Escape closes it.
- [ ] `cloneToNode` fires the fixture transition: a new clone appears in `provisioning` immediately, transitions to `ingesting` at 400 ms, to `healthy` at 1600 ms — verified by a fake-timer unit test.
- [ ] `createBranch` appends a new branch chip under the target clone and emits a `branch_created` event that appears on the time axis.
- [ ] The fixture graph's `source` field is a valid `Datasource` entity shape — `DatasourceEntity.parse(graph.source)` succeeds in a test, confirming the fixture matches the persistent shape RFC 0004 will produce from a real DB row.
- [ ] `FlatRoot` export renders Layer 2 at `/env/{fixtureSlug}` — manual smoke confirms navigating directly to `/env/postgres-primary` shows the full Layer 2 view without needing a prior Layer 1 visit.
- [ ] `resolveProjectContext({ sourceSlug: 'unknown' })` returns `null`. `resolveProjectContext({ sourceSlug: 'postgres-primary' })` returns `{ projectId }`.
- [ ] "Back to Canvas" breadcrumb navigates to `/prj/{slug}/environments` — unit test with mocked router.
- [ ] `createEnvironmentFlatPath` exists and is exported from the barrel.
- [ ] No hardcoded English strings.
- [ ] `pnpm web:dev` demo end-to-end works through the full Flow C (Clone to node) and Flow D (Create branch) from spec §3.3.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
pnpm web:dev
# Flow A + B + C + D + E (spec §3.3)
# 1. Navigate to /prj/{slug}/environments → Layer 1 with 3 cards.
# 2. Click postgres-primary → Layer 2 loads with source → volume → 2 clones → branch chips + time axis.
# 3. Click the source node → inspector opens with Source slots.
# 4. Click "Clone to node" → node picker popover opens → pick a fixture node → confirm.
# 5. New clone appears in 'provisioning' → transitions to 'ingesting' at 400ms → 'healthy' at 1600ms.
# 6. Click the new healthy clone → inspector swaps to Clone slots.
# 7. Click "Create branch" → dialog opens → confirm → new chip appears under the clone.
# 8. Time axis gains a 'branch_created' tick.
# 9. Navigate directly to /env/postgres-primary → Layer 2 renders (Flow E).

# Storybook
pnpm --filter @qlm/environments storybook
# Browse: Environments/Layer2View/{Loading, Empty, Ready-2Clones, Ready-3Clones, Error}

# Tests
pnpm --filter @qlm/environments test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
