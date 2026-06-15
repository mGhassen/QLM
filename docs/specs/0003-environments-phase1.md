# Spec — Environments: UI / UX (phase 1)

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Status       | Draft                                                      |
| Author       | Hani Chalouati                                             |
| Created      | 2026-04-11                                                 |
| Implements   | [RFC 0003 — Environments: UI / UX](../rfcs/0003-environments.md) |
| Target phase | Phase 1                                                    |

This document is the implementation spec for RFC 0003 phase 1. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1 of RFC 0003: shell plugin + Layer 1 + Layer 2 + single-view Overview inspector + display types + fixture-backed implementation + `is_source` column. Everything out of scope belongs either to RFC 0004 (core behavior) or to a later phase of this RFC.

A visual prototype of every component this spec describes **already exists** at `/Users/hani.chalouati/Documents/work/qlm/mock-v3/packages/features/project-layer/ops/environments/`. That package (`@workspace/environments`) is **the visual reference** for every screen — not the code source. The POC is built with hand-rolled inline styles, hardcoded English strings, a different package namespace, and a monolithic feature layout; this spec re-implements its visual design in the target repo's conventions (Tailwind + `@qlm/ui`, `@qlm/i18n`, Zod, hexagonal split, `@tanstack/react-router`, `Readonly<Props>`). Every subsection in §7 below names the POC file that a given target-repo file should visually match.

---

## 1. Resolved open questions

Every row is resolved. No TBDs survive into the spec.

| # | Question (from RFC §14)                           | Resolution for phase 1                                                                                                                                                                                          |
|---|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Graph renderer                                    | **Custom SVG.** Hand-rolled connectors and animated lines, following the POC approach in `service-tree-view.tsx` (the `Connectors` and `HorizCloneLink` components). No graph library added. Use `framer-motion` for entry/exit animations only, since it is already a catalog dependency — if not, plain CSS transitions instead. |
| 2 | Flat short URL `/env/{sourceSlug}` for Layer 2    | **Yes.** Add `createFlatPath('env', sourceSlug)` helper in `apps/web/src/config/paths.config.ts`. The plugin manifest declares `flatRoute: { prefix: 'env', params: ['sourceSlug'] }` mirroring the notebook pattern in `packages/apps/notebook/src/manifest.ts`. |
| 3 | Fixture module location                           | **Inside the feature package** at `packages/features/environments/src/fixtures/`, exported from `@qlm/environments/fixtures`. The plugin-root in `packages/apps/environments` imports the fixture adapter from there. When RFC 0004 lands the shell-runtime resource, the plugin-root swaps the import — the feature package's fixtures remain for Storybook. |
| 4 | Non-PG card treatment in Layer 1                  | **Identical rendering** for every provider (Postgres, Redis, MongoDB, MySQL, …). Same card anatomy, same interactions. No visual downgrade for "not yet clone-enabled" engines. In phase 1 everything is fixture-driven so all providers behave identically; RFC 0004 decides the action-side UX for live non-PG sources. |
| 5 | Empty-slot behavior in the inspector              | **Hidden entirely.** Slots for future-phase content (metric tiles, lineage, masking, replication status, commit history) do not render in phase 1. No "—" placeholders. No "coming soon" badges. The component shapes exist so later phases can drop content in, but nothing ships in the chrome that promises future work. |
| 6 | Status chip color map                             | 6 statuses, mapped to these hex values (sourced from the POC palette): `online` and `healthy` → `#22c55e` (green), `ingesting` → `#f59e0b` (amber, with pulse animation), `failed` → `#ef4444` (red), `registered` and `offline` → `#6b7280` (grey). Label text matches the status key, localized. Colors come from Tailwind tokens (`text-green-500`, `text-amber-500`, `text-red-500`, `text-zinc-500`) not hardcoded hex. |
| 7 | Storybook story granularity                       | **One story per state**, per component. Every top-level component has at least four stories: `Loading`, `Empty`, `Ready`, `Error`. Plus state-specific stories where relevant (e.g. `SourceCard.StatusOnline`, `SourceCard.StatusIngesting`, `SourceCard.StatusFailed`). |

Additional clarifications resolved during spec drafting:

- **Inspector has no tabs in phase 1.** RFC §8.2 was silent on tabs; the POC has five (Overview / Logs / Schema / Variables / Settings). Phase 1 ships **only the Overview view**, rendered as a single-panel inspector — no tab bar, no Logs / Schema / Variables / Settings tabs, no "coming soon" affordances for them. Tabs arrive in later phases if/when they carry real content.
- **Tech stack inside the feature package**: React function components, `useMemo` / `useCallback` only when required for stability or perf, `useState` for local UI state, no `useShell()` in phase 1 (fixture-backed), no `useQuery` in phase 1.
- **Icons**: `lucide-react` exclusively. Provider icons for databases come from existing Shadcn icon patterns or short inline SVGs; no emoji in the target repo (POC uses 🐘/🟥/🍃/🐬 — these are replaced with proper icons during port).

## 2. User stories

Each bullet is a user-visible capability delivered by phase 1.

- **As a project member**, I can navigate to `/prj/{projectSlug}/environments` and see the environments app in the project sidebar, next to datasources / notebooks / integrations.
- **As a project member**, I can see a Layer 1 catalogue of all source-role datasources in the current project, rendered as multi-engine cards with provider icon, name, status chip, primary volume label, and default branch label.
- **As a project member**, I can click a source card and navigate to Layer 2 at `/prj/{projectSlug}/environments/{sourceSlug}` — or share the flat short URL `/env/{sourceSlug}` with another member.
- **As a project member**, I can see Layer 2 render the four-level graph for a source — source → volume → clones → branch chips — with the time axis underneath showing lifecycle events.
- **As a project member**, I can select any node in the graph (source / volume / clone / branch) and see the contextual Overview inspector open on the right with slots appropriate to that selection.
- **As a project member**, I can click "Clone to node" on a source in Layer 2 and see a new clone appear in `provisioning` state, transition through `ingesting` to `healthy` via fixture state transitions. (Real behavior lives in RFC 0004.)
- **As a project member**, I can click "Create branch" on a healthy clone and see a new branch chip appear under the clone via a fixture state transition.
- **As a designer or product reviewer**, I can open Storybook and browse every component in every state (loading / empty / ready / error + status variants) for design review.
- **As a developer**, I can import `SourceCard`, `SourceDetail`, `CloneDetail`, `BranchChip`, `EnvironmentGraph`, and the other display types from `@qlm/environments/types` — these are the UX contract RFC 0004's shell-runtime resource will satisfy.
- **As a developer running `pnpm web:dev`**, I can click through the full environments experience end-to-end against fixtures, with no network calls to any backend and no dependency on RFC 0002 or RFC 0004.
- **As an admin with `datasources.manage`**, I can flip `is_source = true` on a datasource row via SQL and the column update is accepted by the DB. **This is not observable in the phase-1 UI** — phase 1 renders from fixtures and does not query `public.datasources`. The column ships in phase 1 so that RFC 0004 can consume it in phase 2 when live data replaces the fixture adapter. No UI is added for flipping `is_source` in phase 1.

## 3. Functional flow

### 3.1 Information architecture

- **Sidebar bucket**: The environments app lives in the `ops` top-level project nav bucket (matching the POC's manifest `projectTopLevelAppBucketId: "ops"`). It sits next to any future ops-related apps.
- **Routes**:
  - `/prj/{projectSlug}/environments` → Layer 1 (catalogue).
  - `/prj/{projectSlug}/environments/{sourceSlug}` → Layer 2 (per-source graph).
  - `/env/{sourceSlug}` → flat short URL, resolves to the same Layer 2 view by looking up the source-role datasource by slug and hydrating the project context.
- **Relationship to other primitives**:
  - Environments **reads from** `datasources` (filtered by `is_source = true`). No write relationship in phase 1.
  - Environments **is adjacent to** datasources — they share the same underlying table; flipping a datasource's `is_source` flag is how a row moves between the two apps' catalogues.
  - Environments **does not touch** notebooks, integrations, accounts, billing, or any other primitive in phase 1.

### 3.2 Screen-by-screen

#### 3.2.1 Layer 1 — catalogue (`Layer1View`)

- **Layout**: Full-bleed dot-grid background. Centered flex-wrap container with max-width matching the POC (`max-w-5xl`). Cards are `200px` wide, 2–4 per row depending on viewport.
- **Header**: None in phase 1 (matches POC). The shell chrome provides the project breadcrumb.
- **Card**: `SourceCard` component. Renders provider icon, name, status dot + label, optional volume stripe, optional default-branch stripe. Hover: subtle border highlight + box shadow. Click: navigates to Layer 2.
- **Empty state**: Centered illustration + "No sources yet" copy + short instruction ("Flip `is_source = true` on a datasource to see it here"). No primary action button in phase 1 since there is no create-source affordance yet.
- **Loading state**: Six skeleton cards (same 200px width, grey shimmer, matching `@qlm/ui/skeleton`).
- **Error state**: `InlineError` component with a generic error message and a retry button.
- **Props** (from the plugin-root):
  ```ts
  type Layer1ViewProps = Readonly<{
    sources: SourceCard[];
    isLoading: boolean;
    error: Error | null;
    onSelectSource: (source: SourceCard) => void;
    onRetry: () => void;
  }>;
  ```

#### 3.2.2 Layer 2 — per-source graph (`Layer2View`)

- **Layout**: Full-bleed dot-grid background. Back breadcrumb top-left: "← Canvas → {sourceName}". Scrollable content area with a centered column containing the graph. Inspector panel docks to the right (width `320px`), animated in with framer-motion.
- **Graph area**: Renders the four-level tree `source → volume → clones → branches`.
  - **Source node**: Styled version of a `SourceCard` with a slightly bolder border and a drop shadow. Click → opens the Source inspector slot set.
  - **Volume node**: Compact row below the source (only when the source has volume metadata). Click → opens the Volume inspector slot set. Collapsed when `volume` is absent.
  - **Clone cards**: Rendered side-by-side in a horizontal row, 220px wide each, 60px gap between columns. Hand-rolled SVG `Connectors` component draws the trunk + horizontal span + drops to each clone (see POC `service-tree-view.tsx` lines 174–203 for the layout math).
  - **Branch chips**: Below each clone card. A `BranchChipStrip` component renders up to 4 chips inline with a `+N` overflow chip. Click a chip → opens the Branch inspector slot set.
- **Lifecycle-event time axis**: Horizontal strip anchored near the bottom of the scrollable area (above the viewport bottom padding). One tick per event. Tooltip on hover shows event type and timestamp.
- **Empty state**: When the source has no clones, render a single "No clones yet" placeholder node where the clone row would be, plus a "Clone to node" button that (in phase 1) triggers a fixture transition.
- **Loading state**: Skeleton source node + skeleton clone columns + skeleton time axis.
- **Error state**: `InlineError` with retry.
- **Props**:
  ```ts
  type Layer2ViewProps = Readonly<{
    graph: EnvironmentGraph | null;
    isLoading: boolean;
    error: Error | null;
    selectedNode: GraphSelection | null;   // what the inspector reflects
    onSelectNode: (selection: GraphSelection) => void;
    onDeselectNode: () => void;
    onCloneToNode: (sourceId: string, nodeId: string) => void;
    onCreateBranch: (cloneId: string) => void;
    onBack: () => void;                    // navigate back to Layer 1
    onRetry: () => void;
  }>;
  ```

#### 3.2.3 Contextual inspector (`ContextualInspector`)

- **Layout**: Right-docked panel, `320px` wide, full height, border-left to separate from canvas. Sticky header with selection title + close button. Single Overview view — **no tab bar**.
- **Slot sets** (switched on `selection.kind`):
  - **`source`**: provider badge + name (big), status chip, `ConnectionStringField` (masked), volume label, default branch label, `CloneToNodeButton` (opens a `NodePickerPopover` in phase 1, triggers fixture transition on confirm).
  - **`volume`**: volume label, "{N} clones" count. Passive — no actions.
  - **`clone`**: node it runs on, status chip, `ConnectionStringField`, `CreateBranchButton` (opens a `BranchNameDialog`, triggers fixture transition on confirm).
  - **`branch`**: parent clone name, branch name, created-at timestamp.
- **Empty inspector**: When nothing is selected, the inspector is closed (not rendered). Selecting an empty graph region closes it.
- **Error state**: If the inspector cannot render (missing selection data), show a small error message and a "Close" button.
- **Props**:
  ```ts
  type ContextualInspectorProps = Readonly<{
    selection: GraphSelection;
    graph: EnvironmentGraph;
    onClose: () => void;
    onCloneToNode: (sourceId: string, nodeId: string) => void;
    onCreateBranch: (cloneId: string) => void;
  }>;
  ```

### 3.3 User flows (happy paths)

**Flow A — Browse the catalogue and open a source**

1. User navigates to `/prj/{projectSlug}/environments`.
2. Plugin-root calls `useFixtureSources(projectSlug)` → returns `SourceCard[]`.
3. `Layer1View` renders the grid of cards in `ready` state.
4. User clicks a card.
5. Plugin-root calls `navigate({ to: '/prj/$projectSlug/environments/$sourceSlug', params: { projectSlug, sourceSlug: source.slug } })`.
6. Layer 2 mounts for that source.

**Flow B — Inspect the graph**

1. Layer 2 is mounted for a source.
2. Plugin-root calls `useFixtureEnvironmentGraph(sourceSlug)` → returns `EnvironmentGraph`.
3. `Layer2View` renders source node → volume → clones → branch chips + time axis.
4. User clicks the source node → `selection = { kind: 'source', sourceId }` → inspector opens with Source slots.
5. User clicks a clone → `selection = { kind: 'clone', cloneId }` → inspector swaps to Clone slots.
6. User clicks a branch chip → `selection = { kind: 'branch', branchId }` → inspector swaps to Branch slots.
7. User clicks an empty canvas region → `selection = null` → inspector closes.

**Flow C — Fixture clone-to-node transition**

1. In Layer 2 with a source selected, user clicks "Clone to node".
2. `NodePickerPopover` opens with a fixture list of nodes.
3. User picks a node.
4. Fixture adapter synchronously appends a new clone with status `provisioning` to the graph, plus a `clone_requested` lifecycle event.
5. After a short `setTimeout` (400ms), fixture transitions status to `ingesting` and emits `ingest_started`.
6. After another `setTimeout` (1200ms), fixture transitions to `healthy` and emits `ingest_completed`.
7. Layer 2 re-renders at each step; inspector updates if the new clone is selected.
8. **No network calls.** Every step is local React state.

**Flow D — Fixture branch creation**

1. In Layer 2 with a healthy clone selected, user clicks "Create branch".
2. `BranchNameDialog` opens, pre-filled with a generated name (e.g. `main-2`).
3. User confirms.
4. Fixture adapter synchronously appends a new branch chip with a generated timestamp + emits a `branch_created` lifecycle event.
5. Layer 2 re-renders the branch strip under the clone; time axis gains a tick.

**Flow E — Open Layer 2 via flat short URL**

1. User navigates to `/env/{sourceSlug}`.
2. The flat route's `resolveProjectContext` (exported from the plugin-root) looks up the source-role datasource by slug using the (phase 1) fixture adapter.
3. The shell mounts with the correct project context.
4. Flow B begins.

### 3.4 Error and edge-case behaviour

- **Source not found (Layer 2)**: Render `Layer2View` in an error state with message "Source not found" and a "Back to catalogue" button that navigates to Layer 1.
- **Clone action on already-provisioning clone**: `CloneToNodeButton` disables itself while a clone is in-flight in fixtures.
- **Branch action on non-healthy clone**: `CreateBranchButton` disables when `clone.status !== 'healthy'`. Tooltip localized: `environments.errors.branchNotReady`.
- **Fixture error state for smoke testing**: The fixture adapter accepts a `forceState` parameter read from a URL query param (`?demo=error`) that returns an error for Storybook-like in-app manual testing. Not user-facing; only used in manual smoke and stories.
- **Flat short URL for an unknown slug**: `resolveProjectContext` returns `null`, which surfaces a standard 404 via the existing flat-route catch-all.
- **Graph with 0 clones**: Render an inline "No clones yet" node below the volume row. "Clone to node" button still available on the source inspector.
- **Graph with 1 clone**: The horizontal clone-to-clone dashed links (POC `HorizCloneLink`) **are not ported in phase 1**. Phase 1 renders the clone column without inter-clone links — they are a phase-2 feature tied to replication semantics.

## 4. Technical flow

### 4.1 Layered sequence diagrams

Phase 1 has a very thin stack — fixture adapter feeds presentation components directly. No server, no domain, no adapter layer is touched.

**Sequence — "User opens Layer 2 via flat URL"**

```
Browser (URL /env/foo)
     │
     ▼
Flat route (apps/web/src/routes/...)
     │   calls plugin's resolveProjectContext(params)
     ▼
packages/apps/environments (plugin-root.tsx)
     │   useFixtureSourceBySlug('foo')  ← phase 1 reads from fixture module
     ▼
packages/features/environments/src/fixtures/sources.fixture.ts
     │   returns { projectId: 'prj-1', sourceSlug: 'foo' }
     ▼
apps/web mounts the shell with project-1 context
     │
     ▼
packages/apps/environments (FlatRoot) renders
     │   useFixtureEnvironmentGraph('foo')
     ▼
packages/features/environments/src/fixtures/graph.fixture.ts
     │   returns EnvironmentGraph
     ▼
packages/features/environments/src/components/layer-2-view.tsx
     │   renders source → volume → clones → branches + time axis
```

**Sequence — "User clicks Clone to node"**

```
User click on CloneToNodeButton
     │
     ▼
packages/features/environments/src/components/contextual-inspector.tsx
     │   calls onCloneToNode(sourceId, nodeId)
     ▼
packages/apps/environments/src/plugin-root.tsx
     │   calls the fixture adapter's mutation hook
     ▼
packages/features/environments/src/fixtures/use-fixture-environment-graph.ts
     │   setGraph(next)   ← local React state, no network
     │   scheduleStateTransition(newCloneId, 'ingesting', 400ms)
     │   scheduleStateTransition(newCloneId, 'healthy', 1600ms)
     ▼
Layer2View re-renders with new clone in provisioning state
     │
     ▼
(after 400ms timer) Layer2View re-renders with status ingesting
     │
     ▼
(after 1600ms timer) Layer2View re-renders with status healthy
```

Phase 2 onwards (RFC 0004) replaces the fixture mutation hook with a `useMutation` against `shell.environments.cloneToNode(...)`. The sequence above is the template RFC 0004 will wire to.

### 4.2 Component split

Per `.claude/rules/hexagonal-architecture.md`:

- **Thin plugin app** (`packages/apps/environments`):
  - `src/manifest.ts` — `PluginManifest` export. Matches the notebook pattern.
  - `src/plugin-root.tsx` — two exports: default (Layer 1 view wrapped with the fixture adapter) and `FlatRoot` (Layer 2 view wrapped with the fixture adapter). Optional `resolveProjectContext` export for the flat route.
  - `src/index.ts` — re-exports `manifest` and `EnvironmentsPluginRoot`.
  - **No components** live here. Everything beyond plugin wiring is in the feature package.
- **Feature package** (`packages/features/environments`):
  - `src/components/` — every presentational component (Layer1View, Layer2View, ContextualInspector, SourceCard, GraphSourceNode, GraphVolumeNode, GraphCloneNode, GraphBranchChipStrip, GraphConnectors, LifecycleEventAxis, StatusChip, ConnectionStringField, NodePickerPopover, BranchNameDialog, EmptySlot, InlineError).
  - `src/types/` — Zod schemas + inferred types.
  - `src/fixtures/` — fixture data + the fixture adapter hooks.
  - `src/index.ts` — public exports.
- **Host app** (`apps/web`):
  - `src/shell/app-registry.ts` — no change (Vite-glob picks up the new plugin automatically).
  - `src/config/paths.config.ts` — add `createEnvironmentsPath` and the flat-route helper.
  - No other host changes.

## 5. API contracts

### 5.1 Data shapes

All types live in `packages/features/environments/src/types/`. One file per concept; all exported from `src/types/index.ts` and re-exported from the package root as `@qlm/environments/types`.

**Schema alignment — no drift.** `qlm-console-v3` is a fusion of `qwery-enterprise` and `qlm-console v1`; its database schema already contains the `datasources` table that source-role entries live in. The source-side display types defined below **do not reinvent field names** — they reuse the existing `Datasource` entity exported by `@qlm/domain/entities` (`packages/domain/src/entities/datasource.type.ts`), which in turn mirrors `public.datasources` as defined in `apps/web/supabase/schemas/04-initial-tables.sql:238-256`. A `SourceCard` is a **view projection** over the persistent `Datasource` row plus a small set of view-only fields (`status`, `volumeLabel`, `defaultBranchLabel`, `connectionStringMasked`) that are **not columns in `public.datasources`** — in phase 1 they are populated by the fixture adapter, and in RFC 0004 they are produced by the node-side control plane. Every view-only field is called out explicitly below. The node-side types (`VolumeDetail`, `CloneDetail`, `BranchChip`, `BranchDetail`, `LifecycleEvent`, `EnvironmentGraph`) are **greenfield display contracts** — they describe data that lives inside a node (RFC 0002) and is consumed by the shell runtime (RFC 0004). There is no v3 schema to drift from for those types.

The `datasource_provider` column is **free-form text**, not an enum — there is no `SourceProvider` enum in the codebase and this spec does not introduce one. Any `text` value is valid. The UI maps known provider strings (`'postgres'`, `'mysql'`, `'mongo'`, `'redis'`, …) to icons with a generic fallback for unknowns; matching is done inside the icon component, not at the type level.

```ts
// packages/features/environments/src/types/source-status.ts
import { z } from 'zod';

// View-only enum. This is NOT a column on public.datasources — source status
// is derived at render time (fixture in phase 1, node-side in RFC 0004).
export const SourceStatusSchema = z.enum([
  'online',
  'offline',
  'registered',
  'ingesting',
  'healthy',
  'failed',
]);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
```

```ts
// packages/features/environments/src/types/source-card.ts
import { z } from 'zod';
import { DatasourceSchema } from '@qlm/domain/entities';
import { SourceStatusSchema } from './source-status';

// SourceCard is a view projection over the existing Datasource entity.
// - Persistent fields come from public.datasources via DatasourceSchema.pick(...).
// - View-only fields (status, volumeLabel, defaultBranchLabel) are NOT columns.
//   Phase 1: populated by the fixture adapter.
//   RFC 0004: populated by the node-side control plane (the shell runtime
//   resource builds a SourceCard by joining a Datasource row with node data).
export const SourceCardSchema = DatasourceSchema.pick({
  id: true,
  projectId: true,
  slug: true,
  name: true,
  datasource_provider: true,   // free-form text — no SourceProvider enum
  datasource_kind: true,       // existing 'embedded' | 'remote' enum
}).extend({
  // ── View-only additions (not persisted in public.datasources) ────────────
  status: SourceStatusSchema,
  volumeLabel: z.string().nullable(),
  defaultBranchLabel: z.string().nullable(),
});
export type SourceCard = z.infer<typeof SourceCardSchema>;
```

```ts
// packages/features/environments/src/types/source-detail.ts
import { z } from 'zod';
import { DatasourceSchema } from '@qlm/domain/entities';
import { SourceStatusSchema } from './source-status';

// SourceDetail carries everything Layer 2's Source inspector slot renders.
// It is the full Datasource entity (description, config, timestamps, etc.)
// plus the same view-only additions as SourceCard plus one more:
// connectionStringMasked, which is derived from Datasource.config (jsonb)
// at render time — NOT a column on public.datasources.
export const SourceDetailSchema = DatasourceSchema.extend({
  // ── View-only additions ──────────────────────────────────────────────────
  status: SourceStatusSchema,
  volumeLabel: z.string().nullable(),
  defaultBranchLabel: z.string().nullable(),
  connectionStringMasked: z.string(),  // derived from config.connectionString
});
export type SourceDetail = z.infer<typeof SourceDetailSchema>;
```

Note: Story 004 (`add is_source datasources column`) extends `DatasourceSchema` in `packages/domain/src/entities/datasource.type.ts` with `is_source: z.boolean().default(false)` alongside the column migration, so `SourceCardSchema` and `SourceDetailSchema` automatically inherit the new field via `.pick(...)` / `.extend(...)` without a second edit in Story 002.

```ts
// packages/features/environments/src/types/volume-detail.ts
import { z } from 'zod';

export const VolumeDetailSchema = z.object({
  id: z.string(),
  label: z.string(),
  sizeBytes: z.number().int().nonnegative().nullable(),
});
export type VolumeDetail = z.infer<typeof VolumeDetailSchema>;
```

```ts
// packages/features/environments/src/types/clone-detail.ts
import { z } from 'zod';
import { SourceStatusSchema } from './source-status';
import { BranchChipSchema } from './branch-chip';

export const CloneDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: SourceStatusSchema,
  nodeLabel: z.string(),
  connectionStringMasked: z.string(),
  createdAt: z.string().datetime(),
  branches: z.array(BranchChipSchema),
});
export type CloneDetail = z.infer<typeof CloneDetailSchema>;
```

```ts
// packages/features/environments/src/types/branch-chip.ts
import { z } from 'zod';
import { SourceStatusSchema } from './source-status';

export const BranchChipSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: SourceStatusSchema,
});
export type BranchChip = z.infer<typeof BranchChipSchema>;
```

```ts
// packages/features/environments/src/types/branch-detail.ts
import { z } from 'zod';
import { BranchChipSchema } from './branch-chip';

export const BranchDetailSchema = BranchChipSchema.extend({
  parentCloneId: z.string().uuid(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid().nullable(),
});
export type BranchDetail = z.infer<typeof BranchDetailSchema>;
```

```ts
// packages/features/environments/src/types/lifecycle-event.ts
import { z } from 'zod';

export const LifecycleEventTypeSchema = z.enum([
  'source_registered',
  'clone_requested',
  'ingest_started',
  'ingest_completed',
  'ingest_failed',
  'branch_created',
]);
export type LifecycleEventType = z.infer<typeof LifecycleEventTypeSchema>;

export const LifecycleEventSchema = z.object({
  id: z.string().uuid(),
  type: LifecycleEventTypeSchema,
  timestamp: z.string().datetime(),
  subjectId: z.string(),            // source / clone / branch id
  message: z.string().nullable(),
});
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;
```

```ts
// packages/features/environments/src/types/environment-graph.ts
import { z } from 'zod';
import { SourceDetailSchema } from './source-detail';
import { VolumeDetailSchema } from './volume-detail';
import { CloneDetailSchema } from './clone-detail';
import { LifecycleEventSchema } from './lifecycle-event';

export const EnvironmentGraphSchema = z.object({
  source: SourceDetailSchema,
  volume: VolumeDetailSchema.nullable(),
  clones: z.array(CloneDetailSchema),
  events: z.array(LifecycleEventSchema),
});
export type EnvironmentGraph = z.infer<typeof EnvironmentGraphSchema>;
```

```ts
// packages/features/environments/src/types/graph-selection.ts
export type GraphSelection =
  | { kind: 'source'; sourceId: string }
  | { kind: 'volume'; volumeId: string }
  | { kind: 'clone'; cloneId: string }
  | { kind: 'branch'; branchId: string };
```

### 5.2 Endpoints

**None.** Phase 1 introduces no new HTTP endpoints. The plugin app makes no network calls. The single schema change (`is_source` column) is applied via Supabase migration and read through existing Supabase clients, which phase 1 does not use — the environments plugin reads exclusively from the fixture adapter. RFC 0004 adds `/environments/*` routes when live wiring lands.

### 5.3 Rate limiting, pagination, caching

**N/A in phase 1.** Nothing to rate-limit, nothing to paginate, nothing to cache beyond React's own render memoization.

## 6. Data model

### 6.1 Schema

Single migration file at `apps/web/supabase/schemas/36-datasources-is-source.sql`:

```sql
-- Add the is_source boolean column to datasources.
-- Powers the environments app's Layer 1 filter.
alter table public.datasources
  add column if not exists is_source boolean not null default false;

-- No backfill: existing rows stay at the default (false) and are invisible
-- to the environments app until a user explicitly opts in.
```

After adding the file:

```bash
pnpm supabase:web:reset
pnpm supabase:web:typegen
```

`packages/supabase/src/database.types.ts` regenerates with the new column on the `datasources` row type. Do not hand-edit that file.

### 6.2 Config / payload contracts

**N/A in phase 1.** No `jsonb` fields are added or modified. `datasources.config` (the existing jsonb blob) is untouched.

### 6.3 Secrets contract

**N/A in phase 1.** The environments plugin does not read any secret. Source connection strings displayed in the inspector are **fixture-generated**, masked, and never touch `ISecretVault`. When RFC 0004 wires live data, source credentials flow through `datasources`' existing secret handling — the environments plugin still never sees raw credentials.

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. Each subsection lists concrete files. This section feeds `/spec-to-stories`.

### 7.1 Domain (`packages/domain`)

**N/A in phase 1.** No domain entity, no repository port, no service, no DTO. The RFC's "no `environments` domain entity" commitment (RFC §5.1) is enforced by this spec adding zero files to `packages/domain`.

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

**N/A in phase 1.** No adapter changes. Existing `datasource.repository.ts` (Supabase adapter) automatically picks up the new `is_source` column via regenerated database types — no code change is required to read it.

### 7.3 Shell runtime (`packages/shell-runtime`)

**N/A in phase 1.** No `environments` resource is added to `useShell()`. That belongs to RFC 0004. The plugin-root reads from the fixture adapter, not from the shell client.

### 7.4 Server (`apps/server`)

**N/A in phase 1.** No new routes, no new route factories. The existing `datasources` route serves the new column implicitly when its callers select `*`.

### 7.5 Presentation — feature package (`packages/features/environments`)

**New package.** Mirror the layout of `packages/features/notebook`. `package.json` dependencies: `@qlm/ui`, `@qlm/i18n`, `@qlm/shell-contracts`, `zod`, `framer-motion` (if available in catalog; otherwise drop it and use CSS transitions), `lucide-react`. Peer deps: `react`, `react-dom`, `@tanstack/react-router`.

Visual reference column below lists the POC file each target file should visually match. **The POC is a visual reference, not a code source** — every file is re-implemented in target-repo idioms (Tailwind + `@qlm/ui` primitives, `@qlm/i18n`, Zod schemas, `Readonly<Props>`).

| File to create | Role | POC visual reference |
|---|---|---|
| `package.json` | Package manifest | — |
| `tsconfig.json` | TS config extending `@qlm/tsconfig` | — |
| `vitest.config.ts` | Vitest config | — |
| `src/index.ts` | Public exports | — |
| `src/types/index.ts` | Type barrel | — |
| `src/types/source-status.ts` | `SourceStatus` view-only enum + schema. Not a DB column — see §5.1. | `service-card.tsx` line 26 (POC's `ServiceStatus`) |
| `src/types/source-card.ts` | `SourceCard` schema built as `DatasourceSchema.pick(...).extend(view-only fields)`. Persistent columns come from `@qlm/domain/entities`; view-only fields are `status`, `volumeLabel`, `defaultBranchLabel`. No `provider` enum — the existing `datasource_provider: text` column is free-form. | `service-card.tsx` lines 29–39 (visual reference only — naming aligns to `Datasource` entity, not POC's `Service`) |
| `src/types/source-detail.ts` | `SourceDetail` schema built as `DatasourceSchema.extend(view-only fields)`. Inherits `description`, `config`, `createdAt`/`updatedAt`/`createdBy`/`updatedBy`, `isPublic`, `remixedFrom`, `datasource_driver`, `datasource_kind`, `datasource_provider`, and (once Story 004 lands) `is_source`. Adds view-only `status`, `volumeLabel`, `defaultBranchLabel`, `connectionStringMasked` (derived from `config.connectionString`). | — |
| `src/types/volume-detail.ts` | `VolumeDetail` schema + type | — |
| `src/types/clone-detail.ts` | `CloneDetail` schema + type | — |
| `src/types/branch-chip.ts` | `BranchChip` schema + type | — |
| `src/types/branch-detail.ts` | `BranchDetail` schema + type | — |
| `src/types/lifecycle-event.ts` | `LifecycleEvent*` schemas + types | — |
| `src/types/environment-graph.ts` | Top-level `EnvironmentGraph` schema + type | — |
| `src/types/graph-selection.ts` | `GraphSelection` discriminated union | — |
| `src/fixtures/index.ts` | Fixture barrel | — |
| `src/fixtures/sources.fixture.ts` | `FIXTURE_SOURCES: SourceCard[]` — 3 sample sources (postgres-primary, redis-cache, mongo-docs) | `environments-workspace-mock.tsx` lines 11–22 |
| `src/fixtures/graph.fixture.ts` | `buildFixtureGraph(sourceSlug)` → `EnvironmentGraph` with volume + 2 clones + branches | `service-tree-view.tsx` lines 291–306 |
| `src/fixtures/events.fixture.ts` | `FIXTURE_EVENTS: LifecycleEvent[]` spanning all 6 event types | — (POC has no events axis) |
| `src/fixtures/use-fixture-sources.ts` | React hook: `useFixtureSources(projectSlug)` → `{ sources, isLoading, error }` | — |
| `src/fixtures/use-fixture-environment-graph.ts` | React hook: `useFixtureEnvironmentGraph(sourceSlug)` → `{ graph, isLoading, error, cloneToNode, createBranch }` with the fake state transitions from flow C and D | — |
| `src/components/index.ts` | Component barrel | — |
| `src/components/layer-1-view.tsx` | `Layer1View` + states | `environments-services-canvas.tsx` |
| `src/components/layer-1-view.stories.tsx` | Stories: Loading / Empty / Ready / Error | — |
| `src/components/source-card.tsx` | `SourceCard` component | `service-card.tsx` (visual), ~290 lines → ~150 in target |
| `src/components/source-card.stories.tsx` | Stories: every status variant + volume/branch combinations | `service-card.stories.tsx` |
| `src/components/layer-2-view.tsx` | `Layer2View` + states | `service-tree-view.tsx` main layout |
| `src/components/layer-2-view.stories.tsx` | Stories: Loading / Empty / Ready (with 0/1/3 clones) / Error | — |
| `src/components/graph/graph-source-node.tsx` | Source node in the graph | `service-tree-view.tsx` lines 683–752 |
| `src/components/graph/graph-volume-node.tsx` | Volume node in the graph | Derived from POC volume stripe pattern |
| `src/components/graph/graph-clone-node.tsx` | Clone node in the graph | `service-tree-view.tsx` lines 53–97 (`CloneNode`) — **drop the "Live replication" chip and the branching action**; phase 1 only renders the clone name + status dot + "create branch" button |
| `src/components/graph/graph-branch-chip-strip.tsx` | Row of branch chips with `+N` overflow | — (POC uses `NoBranchesNode`; phase 1 renders a real chip strip for the fixture branches) |
| `src/components/graph/graph-connectors.tsx` | Hand-rolled SVG tree connectors | `service-tree-view.tsx` lines 174–203 (`Connectors`) |
| `src/components/graph/environments-canvas-dot-grid.tsx` | Dot-grid background | `environments-canvas-dot-grid.tsx` (16 LOC) |
| `src/components/graph/graph.stories.tsx` | Stories: individual graph elements | — |
| `src/components/lifecycle-event-axis.tsx` | Horizontal time axis with ticks + tooltips | — (POC has no axis; designed fresh) |
| `src/components/lifecycle-event-axis.stories.tsx` | Stories: Empty / Few events / Dense events | — |
| `src/components/contextual-inspector.tsx` | `ContextualInspector` shell + slot-set switcher (no tabs) | `service-right-panel.tsx` (reference for visual style only; target is much smaller — single Overview view with 4 slot sets) |
| `src/components/contextual-inspector.stories.tsx` | Stories: Source / Volume / Clone / Branch / Closed | `service-right-panel.stories.tsx` |
| `src/components/inspector-slots/source-slots.tsx` | Source-selection slots | `service-right-panel.tsx` lines 174–234 (Overview section) — **drop metric cards, storage box, connection stats, lineage** |
| `src/components/inspector-slots/volume-slots.tsx` | Volume-selection slots | — |
| `src/components/inspector-slots/clone-slots.tsx` | Clone-selection slots | — |
| `src/components/inspector-slots/branch-slots.tsx` | Branch-selection slots | — |
| `src/components/primitives/status-chip.tsx` | Shared status chip (or thin wrapper on `@qlm/ui/badge`) | `service-card.tsx` lines 98–131 (`StatusDot`, `StatusLabel`) |
| `src/components/primitives/status-chip.stories.tsx` | Stories: one per status | — |
| `src/components/primitives/connection-string-field.tsx` | Masked connection string + copy button | `service-right-panel.tsx` lines 76–109 (`ConnectionBox`) |
| `src/components/primitives/connection-string-field.stories.tsx` | Stories | — |
| `src/components/primitives/node-picker-popover.tsx` | Popover with fixture node list | — (POC wizard at `cmdk-palette.tsx` is out of scope) |
| `src/components/primitives/branch-name-dialog.tsx` | Dialog with branch name input | — |
| `src/components/primitives/inline-error.tsx` | Error state with retry | — |
| `src/components/primitives/primitives.stories.tsx` | Stories for small primitives | — |

Tests colocated: each component gets a `foo.test.tsx` next to `foo.tsx` for any component with state transitions (fixture adapter hooks, inspector slot-set switching, branch creation flow). Purely presentational components (status chip, connection string field) are covered by Storybook stories only, per `.claude/rules/testing.md`.

### 7.6 Shell app (`packages/apps/environments`)

**New package.** Mirror `packages/apps/notebook`. Dependencies: `@qlm/environments`, `@qlm/shell-contracts`, `@qlm/shell-runtime` (only for types at this point), `@tanstack/react-router`, `react`, `react-dom`.

| File | Role |
|---|---|
| `package.json` | Thin plugin package manifest |
| `tsconfig.json` | TS config |
| `src/index.ts` | `export { manifest } from './manifest'; export { default as EnvironmentsPluginRoot } from './plugin-root';` |
| `src/manifest.ts` | `PluginManifest` — `id: 'environments'`, `displayName: 'Environments'`, `icon: 'SquareTerminal'`, `layer: 'project'`, `routeBase: 'environments'`, `projectTopLevelAppBucketId: 'ops'`, `flatRoute: { prefix: 'env', params: ['sourceSlug'] }`, `nav: { slot: 'project.topLevelNav', primary: { label: 'Environments', icon: 'SquareTerminal', order: 15 } }` |
| `src/plugin-root.tsx` | Default export: `EnvironmentsPluginRoot` — calls `useFixtureSources(projectSlug)` from the feature package's fixtures module, renders `Layer1View` with its callbacks wired. `FlatRoot` export: calls `useFixtureEnvironmentGraph(sourceSlug)`, renders `Layer2View`. `resolveProjectContext` export: reads the fixture source by slug and returns `{ projectId }`. |

### 7.7 i18n (`packages/i18n`)

| File | Role |
|---|---|
| `src/locales/en/environments.json` | English strings — new namespace |
| `src/locales/{fr,es,de,...}/environments.json` | Matching translations for every existing locale |

Every user-facing string in the ported POC components is extracted. Keys are defined in §11. No hardcoded strings survive anywhere in `packages/features/environments` or `packages/apps/environments`.

### 7.8 Host app (`apps/web`)

Minimal changes — the Vite-glob registry picks up the new plugin automatically. Only host changes:

| File | Change |
|---|---|
| `apps/web/src/config/paths.config.ts` | Add `createEnvironmentsPath(projectSlug: string)` and `createEnvironmentFlatPath(sourceSlug: string)` helpers |
| `apps/web/package.json` | Add `@qlm/environments` and `@qlm/apps-environments` to dependencies |

No route file additions (the plugin's `routeBase` handles project-contextual routing; the flat route uses the existing catch-all mechanism).

### 7.9 Supabase schema

| File | Change |
|---|---|
| `apps/web/supabase/schemas/36-datasources-is-source.sql` | New file — the `is_source` column addition from §6.1 |

After creation:

```bash
pnpm --filter web run supabase:db:diff -f datasources-is-source
pnpm supabase:web:reset
pnpm supabase:web:typegen
```

Story 004 also extends the domain entity in the same change so the entity and the DB stay in sync:

| File | Change |
|---|---|
| `packages/domain/src/entities/datasource.type.ts` | Add `is_source: z.boolean().default(false)` to `DatasourceSchema`, add a matching `@Expose() public is_source!: boolean;` (or camelCase equivalent per the existing entity's convention) to `DatasourceEntity`. `SourceCardSchema` and `SourceDetailSchema` in `packages/features/environments` pick this field up automatically via `.pick(...)` / `.extend(...)`. |

### 7.10 Storybook tooling

Storybook is already configured at the repo level. New stories land in the feature package and are picked up by the existing Storybook run. Verify by running whatever command the repo uses (`pnpm --filter @qlm/environments storybook` or similar — check `tooling/storybook` for the actual script) and confirming stories render.

## 8. Permissions and RLS

- **No new permission.** The existing `datasources.manage` permission covers the only new write action in phase 1 (flipping `is_source`). Layer 1 reads use the existing `datasources_read` policy.
- **No new RLS policy.** The `is_source` column is a boolean on an existing table; existing policies apply to reads and writes automatically.
- **No new enum values.** `public.app_permissions` enum is untouched.
- **Schema file `36-datasources-is-source.sql` adds no `create policy` statements.** It only runs `alter table ... add column ...`.

This entire section is **zero delta** against the existing database security model. That is by design — see RFC 0003 §12.

## 9. Security checklist

- [ ] The `is_source` column has a non-null default and no nullable gap.
- [ ] Flipping `is_source` is gated by `datasources.manage` (inherited from existing RLS).
- [ ] Reads of source-role datasources go through `datasources_read` (inherited).
- [ ] No new secret handling is introduced. Phase 1 has no network calls.
- [ ] Fixture connection strings are obviously fake (`postgres://admin@postgres-primary.internal:5432/main`-style) and contain no real credentials.
- [ ] No hardcoded API keys, tokens, or passwords in fixtures.
- [ ] No `dangerouslySetInnerHTML` anywhere in the feature package.
- [ ] No `eval`, no `Function()` constructor.
- [ ] Inspector's `ConnectionStringField` masks password segments via a client-side regex before rendering (POC exposes raw — target repo hardens this).
- [ ] Copy-to-clipboard for connection strings copies the **masked** value, never the raw one.
- [ ] No raw HTML from fixtures injected into the DOM — all strings render via React text nodes.
- [ ] `resolveProjectContext` for the flat route returns `null` on any unknown slug (no information disclosure via 200 responses).
- [ ] No third-party network egress from the feature package or plugin app.

## 10. Verification plan

### 10.1 Static checks

```bash
pnpm typecheck    # must pass across @qlm/environments, @qlm/apps-environments, apps/web
pnpm lint         # must pass; ESLint rule against react-i18next/Trans must not fire
pnpm format:fix   # Prettier — no diff expected after running
```

Also:

- Every component prop type uses `Readonly<...>`.
- Every user-facing string routes through `t(...)` or `<Trans>` — confirmed by grep for hardcoded English strings in the new packages (no occurrences of `>[A-Z][a-z]+ ` in JSX text nodes).
- Every Zod schema matches its inferred TypeScript type (confirmed by type usage, not a separate test).

### 10.2 Unit tests

- **`@qlm/environments`**: Vitest + @testing-library/react.
  - `source-card.test.tsx` — renders every status variant, renders with/without volume/branch, calls `onClick`.
  - `layer-1-view.test.tsx` — renders Ready / Empty / Loading / Error states; clicking a card calls `onSelectSource`.
  - `layer-2-view.test.tsx` — renders Ready with fixture graph; selecting a clone invokes `onSelectNode` with correct payload.
  - `contextual-inspector.test.tsx` — renders the correct slot set for each `GraphSelection.kind`; closing calls `onClose`; clone-to-node and create-branch callbacks wired.
  - `connection-string-field.test.tsx` — masks `password` segment; copy button copies masked value.
  - `use-fixture-environment-graph.test.ts` — cloneToNode transitions through `provisioning` → `ingesting` → `healthy` on the expected timers (using fake timers).
  - `use-fixture-sources.test.ts` — returns the fixture list synchronously.
  - Schema tests: `source-card.schema.test.ts` — Zod rejects invalid inputs, accepts valid ones. One test file per schema.
- **Coverage target**: 80%+ line coverage on `packages/features/environments/src/` per the testing rules. `packages/apps/environments/src/` has trivial coverage (manifest + plugin-root wrapping), no unit tests required beyond smoke.

### 10.3 Integration tests

**N/A in phase 1.** No server, no database read paths that aren't fixture-backed. The `is_source` column migration is verified by `pnpm supabase:web:reset` running cleanly and `pnpm supabase:web:typegen` producing a `database.types.ts` that includes the new column — both are part of the static-checks stage.

### 10.4 End-to-end (Playwright)

One smoke spec at `apps/e2e/tests/environments/layer-1-and-2.spec.ts`:

1. Sign in as a fixture user in a fixture project.
2. Navigate to `/prj/{fixture-slug}/environments`.
3. Assert Layer 1 renders with the three fixture source cards.
4. Click `postgres-primary`.
5. Assert Layer 2 renders with the source node, volume node, and at least one clone card.
6. Click the source node.
7. Assert the inspector opens with the Source slot set.
8. Click a clone card.
9. Assert the inspector swaps to the Clone slot set.
10. Click "Create branch" on the clone.
11. Confirm the branch name dialog.
12. Assert a new branch chip appears under the clone.
13. Navigate to `/env/postgres-primary` directly.
14. Assert Layer 2 renders at the same state.

This smoke spec uses the same fixture adapter as the app — there's nothing to mock. It runs against `pnpm web:dev` without any server or supabase running.

### 10.5 Manual smoke

Step-by-step for a human reviewer:

1. `git pull`, `pnpm install`.
2. `pnpm supabase:web:reset && pnpm supabase:web:typegen` — must succeed with the new `is_source` column.
3. `pnpm typecheck` — must pass.
4. `pnpm test` — unit tests pass, Vitest coverage ≥ 80% on the new feature package.
5. `pnpm web:dev` — the shell runs on http://localhost:3000.
6. Sign in, enter any existing project.
7. Confirm "Environments" appears in the project sidebar under the `ops` bucket.
8. Click it — Layer 1 renders with three fixture source cards (postgres, redis, mongo).
9. Click the Postgres card — navigates to `/prj/{slug}/environments/postgres-primary`. Layer 2 renders with the source at the top, volume row, two clones side by side, branch chips under each clone, a horizontal lifecycle axis at the bottom.
10. Click the source node — inspector opens on the right with Source slots (provider, name, status chip, connection string, volume label, default branch label, "Clone to node" button).
11. Click a clone — inspector swaps to Clone slots.
12. Click a branch chip — inspector swaps to Branch slots.
13. Click empty canvas — inspector closes.
14. Click "Clone to node" on the source — node picker opens, pick a fixture node, confirm. A new clone appears in `provisioning`, transitions through `ingesting` to `healthy` over ~1.6s.
15. Click "Create branch" on a healthy clone — dialog opens, confirm. A new branch chip appears under the clone and a tick appears on the time axis.
16. Click "Back to Canvas" (or the shell's back navigation) — returns to Layer 1.
17. Run `pnpm --filter @qlm/environments storybook` (or whatever the feature-local Storybook command is). Every component renders its loading / empty / ready / error stories without errors.
18. Visually compare each Storybook story against the corresponding POC screen (`/Users/hani.chalouati/Documents/work/qlm/mock-v3/.../environments-workspace.stories.tsx` served by its own Storybook). Every shipped component should visually match its POC counterpart, minus the deferred slots (masking, branch history, metric tiles, replication chips, lineage, context menus, infra footer, env-tabs navbar, ⌘K palette, extra inspector tabs).
19. Hit `/env/postgres-primary` directly in the address bar. Layer 2 renders via the flat route without requiring a prior Layer 1 visit.

If any step above fails, the phase-1 spec has not shipped.

## 11. i18n key map

All keys live in `packages/i18n/src/locales/*/environments.json` under the `environments` namespace.

**Layer 1**:
- `environments.layer1.title`
- `environments.layer1.empty.heading`
- `environments.layer1.empty.body`
- `environments.layer1.error.heading`
- `environments.layer1.error.retry`
- `environments.layer1.loading.sr`

**Layer 2**:
- `environments.layer2.backToCatalogue`
- `environments.layer2.empty.heading`
- `environments.layer2.empty.body`
- `environments.layer2.error.heading`
- `environments.layer2.error.retry`
- `environments.layer2.noClones.heading`
- `environments.layer2.noClones.action`
- `environments.layer2.graph.cloneLabel`
- `environments.layer2.graph.branchLabel`
- `environments.layer2.graph.branchOverflow`    // "+{count}"
- `environments.layer2.axis.legend`
- `environments.layer2.axis.tooltip.eventType`
- `environments.layer2.axis.tooltip.timestamp`

**Inspector**:
- `environments.inspector.close.ariaLabel`
- `environments.inspector.source.title`
- `environments.inspector.source.connectionString`
- `environments.inspector.source.volumeLabel`
- `environments.inspector.source.defaultBranchLabel`
- `environments.inspector.source.actions.cloneToNode`
- `environments.inspector.volume.title`
- `environments.inspector.volume.cloneCount`
- `environments.inspector.clone.title`
- `environments.inspector.clone.nodeLabel`
- `environments.inspector.clone.connectionString`
- `environments.inspector.clone.actions.createBranch`
- `environments.inspector.branch.title`
- `environments.inspector.branch.parentClone`
- `environments.inspector.branch.createdAt`

**Status chips** (one key per status):
- `environments.status.online`
- `environments.status.offline`
- `environments.status.registered`
- `environments.status.ingesting`
- `environments.status.healthy`
- `environments.status.failed`

**Actions**:
- `environments.actions.cloneToNode.confirm`
- `environments.actions.cloneToNode.cancel`
- `environments.actions.cloneToNode.nodePickerLabel`
- `environments.actions.cloneToNode.emptyNodes`
- `environments.actions.createBranch.confirm`
- `environments.actions.createBranch.cancel`
- `environments.actions.createBranch.nameLabel`
- `environments.actions.createBranch.namePlaceholder`
- `environments.actions.copy.tooltip`
- `environments.actions.copy.copied`

**Events** (one key per event type):
- `environments.events.source_registered`
- `environments.events.clone_requested`
- `environments.events.ingest_started`
- `environments.events.ingest_completed`
- `environments.events.ingest_failed`
- `environments.events.branch_created`

**Errors**:
- `environments.errors.generic`
- `environments.errors.sourceNotFound`
- `environments.errors.graphNotFound`
- `environments.errors.branchNotReady`
- `environments.errors.cloneInFlight`

Every key is added to every locale JSON file in phase 1. Translations in non-English locales may start as English-identical placeholders but must be present so TypeScript's inferred key union stays consistent.

## 12. Implementation sequencing

Stories produced by `/spec-to-stories` will land in five stages. Each stage clears before the next starts.

**Stage A — types and UI scaffolding**

- Create `packages/features/environments/` (`package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`).
- Add all Zod schemas and inferred types under `src/types/`.
- Add fixture data and fixture adapter hooks under `src/fixtures/`.
- Create `packages/apps/environments/` (`package.json`, `src/index.ts`, `src/manifest.ts`, stub `src/plugin-root.tsx`).
- Wire the shell plugin — verify it appears in the sidebar at `/prj/{slug}/environments` even if the page is empty.
- Add i18n namespace skeleton (`packages/i18n/src/locales/*/environments.json` with the key shape, English values, empty/duplicate non-English values).

**Stage B — data and domain**

**N/A in phase 1.** Stage B is skipped entirely — phase 1 has no domain or data layer work beyond the fixture adapter, which lives in the presentation package.

**Stage C — server**

**N/A in phase 1.** No server work.

**Stage D — web wiring**

- Implement `StatusChip`, `ConnectionStringField`, `InlineError`, `EmptySlot` primitives.
- Implement `SourceCard` component + stories.
- Implement `Layer1View` + stories (Loading / Empty / Ready / Error).
- Implement `GraphSourceNode`, `GraphVolumeNode`, `GraphCloneNode`, `GraphBranchChipStrip`, `GraphConnectors`, `EnvironmentsCanvasDotGrid` + stories.
- Implement `LifecycleEventAxis` + stories.
- Implement `ContextualInspector` + slot-set components + stories.
- Implement `NodePickerPopover`, `BranchNameDialog`.
- Implement `Layer2View` composing the graph, axis, and inspector + stories.
- Wire `plugin-root.tsx` Default export to `Layer1View` via `useFixtureSources`.
- Wire `plugin-root.tsx` `FlatRoot` export to `Layer2View` via `useFixtureEnvironmentGraph`.
- Wire `plugin-root.tsx` `resolveProjectContext` export.
- Add `createEnvironmentsPath` + `createEnvironmentFlatPath` to `paths.config.ts`.
- Add the `is_source` schema migration file + run `pnpm supabase:web:reset && pnpm supabase:web:typegen`.

**Stage E — polish and verification**

- Empty / loading / error state refinement across all components.
- Accessibility audit: every interactive element has `aria-label` or visible label, keyboard navigation works through Layer 1 and Layer 2, inspector is keyboard-closable with `Escape`, focus returns correctly after dialog/popover close.
- Unit tests: coverage ≥ 80% on the feature package.
- Visual review: every component's Storybook story vs the POC file named in §7.5.
- Playwright smoke spec.
- Manual smoke per §10.5.
- `pnpm check` passes end-to-end.

## 13. Follow-ups (deferred, not in this phase)

All items move to RFC 0004 or a later phase of this RFC.

- **Live wiring** — replace fixture adapter with `useShell()`-backed resources. **RFC 0004 phase 1.**
- **Clone-to-node real orchestration** — actual node picker, actual control-plane call, actual lifecycle event stream. **RFC 0004 phase 1.**
- **Create-branch real orchestration** — actual RFC 0002 call. **RFC 0004 phase 1.**
- **Source registration UI** — a "Add source" button on Layer 1, a form to enter connection details, and the flip-to-`is_source` action. **RFC 0004 phase 1** (paired with the live wiring).
- **Replication-status inspector panel** — "Live replication" chips + Replication Status slot with mode / lag / last sync / WAL sender. **RFC 0003 phase 2** (wiring) + **RFC 0004 phase 2** (behavior).
- **Per-clone metric tiles** with real data (CPU / Memory / Storage / Connections / Queries / Latency sparklines). **RFC 0003 phase 2** (visuals) + **RFC 0004 phase 2** (node observability surface).
- **Lineage section** in the Source inspector. **Future RFC (environment labels).**
- **Per-commit time axis** — one tick per commit, not per lifecycle event. **RFC 0003 phase 3** (visuals) + **RFC 0004 phase 3** (commit stream from node).
- **Branch History inspector panel** — git-style commit list. **RFC 0003 phase 3.**
- **Data Masking inspector panel** — per-field rule toggles. **Future RFC (data masking).**
- **Clone-to-clone replication links** — horizontal dashed arrows between adjacent clones. **RFC 0003 phase 2.**
- **⌘K command palette** for adding sources and picking nodes/compute/storage. **Not currently planned** — a later UX RFC may introduce it if user research shows the flows need it.
- **Environments navbar** with prod/staging/dev tabs. **Future RFC (environment labels)** — separate concept.
- **Context menus on graph nodes** (Clone / Masking / Replication / Ingestion / Transport / Perf Agent plugins). **Not currently planned** — several of those are separate feature areas that would each justify their own entry point.
- **Infra footer** (Containers / Block Storage / Object Storage breadcrumb). **Not currently planned** — decorative with no phase-1 purpose.
- **Additional inspector tabs** (Logs / Schema / Variables / Settings). **Later phases of RFC 0003** once each tab has real content to show.
- **Org settings and project settings** panels surfaced from the environments navbar. **Not an environments concern** — belongs to the accounts/project feature area.
- **Empty-slot "coming soon" affordances.** Explicitly rejected. Hidden-entirely remains the phase-1 policy; future phases add content, not placeholders.
- **Branch delete, diff, merge.** **RFC 0004 phase 2** (delete) + **RFC 0004 phase 3** (diff/merge).
- **Multi-engine clone-enabled sources** (Redis, MongoDB, MySQL actually ingestable). **RFC 0004 phase 4.**

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- _(empty — no deviations recorded yet)_
