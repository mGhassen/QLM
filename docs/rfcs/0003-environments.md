# RFC 0003 — Environments: UI / UX

| Field      | Value                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------- |
| Status     | Draft                                                                                         |
| Author     | Hani Chalouati                                                                                |
| Created    | 2026-04-11                                                                                    |
| Target     | Phase 1 — UI / UX (shell app, Layer 1 + Layer 2, inspector, display types, fixture-backed)    |
| Supersedes | —                                                                                             |
| Related    | RFC 0001 (Integrations), RFC 0002 (Nodes), RFC 0004 (Environments: core behavior — sibling)   |

## 1. Summary

This RFC defines the **UI and UX surface** for the QLM environments experience: the shell app, the Layer 1 catalogue, the Layer 2 per-source graph, the contextual inspector, the display-side data types, and the visual states each component supports. It is the first of two **sequential** RFCs: this one establishes the visual vocabulary and the rendering contract; the **core behavior RFC (RFC 0004)** is drafted only after this one is spec'd, and inherits the display types and the mockups as its UX contract.

The word *environments* is a UI nickname for this app and for the graph it renders. It is **not a domain primitive** — there is no `environments` table, entity, or repository. Under the hood everything composes over existing primitives (`datasources` today, RFC 0002 nodes and git-like databases later). The only schema change this RFC introduces is a single `is_source boolean` column on `datasources` so Layer 1 has a filter to key off.

The canonical visual reference is the mockup set at `docs/rfcs/0003-environments/`:

- `layer-1-environments.png` — Layer 1 catalogue with multi-engine cards.
- `layer-2-graph.png` — Layer 2 four-level graph and inspector (tabs, metric tiles, lineage).
- `layer-2-with-branches.png` — Layer 2 with branches and replication-status inspector variant.
- `layer-2-branch-history.png` — per-branch history panel variant.
- `layer-2-masking.png` — data masking panel variant.

The mockups span multiple phases. Phase 1 of this RFC implements the subset that does not require live data: shell app, component library, Layer 1 + Layer 2 shapes, inspector with the phase-1 slot inventory, routing, i18n. Implementation is **fixture-backed**: phase 1 ships a typed fixture module and Storybook stories for every component, so the full visual language can be demoed and iterated on before RFC 0004 lands. Live data binding is explicitly out of scope and belongs to RFC 0004.

Phase 1 has **zero hard external dependencies**. The `is_source` column can land immediately; every component renders from typed fixtures; the shell plugin is auto-discovered by the existing Vite-glob registry. RFC 0002 (Nodes) and RFC 0004 (core behavior) become hard dependencies only when real data replaces the fixtures, which is the first goal of RFC 0004.

Phase 1 delivers, end-to-end:

- A new shell plugin app `packages/apps/environments` auto-discovered by `apps/web/src/shell/app-registry.ts`.
- **Layer 1** list view — multi-engine cards (Postgres, Redis, MongoDB, …) with provider icon, name, status chip, primary volume label, default branch label.
- **Layer 2** detail view — four-level graph `source → volume → clones → branch chips` plus a lifecycle-event time axis below.
- **Contextual inspector** — single component swapping slot sets per selection type (Source / Volume / Clone / Branch).
- **Display types** — a Zod-backed TypeScript contract for every render-side data shape, exported from the plugin app, consumed by RFC 0004's shell-runtime resource when it lands.
- **Fixture module** — typed sample data for every component and every state (empty / loading / ready / error), driving Storybook and the demo-able phase-1 app.
- **Storybook stories** for every component and every state.
- **Routing** — `/prj/{slug}/environments` (Layer 1) and `/prj/{slug}/environments/{sourceSlug}` (Layer 2).
- **i18n namespace** `environments` covering every user-facing string.
- **`is_source boolean not null default false`** column on `public.datasources` — the single schema change.

## 2. Motivation

The QLM product story — *"your Postgres, with branches, as a git-like database"* — is a story the user has to be able to **see**. Before anything can be wired to anything, there has to be a screen that tells the user what a source is, what a clone is, what a branch is, and what the relationship between them looks like. That screen is what this RFC defines.

Two observations shaped the decision to split the environments work into a UX RFC and a core-behavior RFC:

1. **The visual language was designed first.** The mockups in `docs/rfcs/0003-environments/` predate any control-plane contract. Product design iterated on "what does this look like" without committing to "what does this talk to". The UX RFC captures that design work as a load-bearing spec so later RFCs can treat it as a fixed contract instead of a sketch.

2. **The core-behavior RFC has a hard upstream dependency (RFC 0002) that the UX work does not have.** Nothing in the visual language requires RFC 0002's control-plane shape to exist. By separating UX from wiring, the UX work ships the moment it is approved — component library, Storybook, shell plugin scaffold, routing, i18n — and the demo is renderable against fixtures. RFC 0004 then picks up the display types as the contract its shell-runtime resource has to satisfy.

A third motivator: **the UX RFC is where the "environment" vocabulary is disarmed**. The word is load-bearing in marketing and in product conversations, but turning it into a domain primitive would create a parallel concept next to `datasources`, nodes, and git-like databases, with its own table, repository, entity, and permission surface. This RFC commits, permanently, to using *environments* as a UI nickname only. See §5.1.

A fourth motivator: **the inspector is a design contract**. The mockups show at least five inspector variants (Overview/metrics, Replication Status, Branch History, Data Masking, plus the basic slots). Many of those variants belong to phases 2, 3, or separate future RFCs. Pinning the inspector's component shape and slot-swap discipline now means future phases can add their variants without restructuring the app.

Finally, **phase-1 delivers real user value without RFC 0004**. A designer or product manager running `pnpm web:dev` and clicking into the environments app sees the full visual language with fixture data — realistic enough to review, test, and iterate on in isolation from any backend work. That shortens the feedback loop and gives the core-behavior RFC a fixed target to wire against.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Each bullet is an observable exit criterion.

- **Shell plugin**: `packages/apps/environments` is auto-discovered by `apps/web/src/shell/app-registry.ts`, appears in the project-scoped sidebar next to datasources / notebooks / integrations, and is reachable at `/prj/{slug}/environments`.
- **Layer 1 catalogue**: renders one card per `is_source = true` datasource in the current project. Cards show provider icon, source name, status chip (Online / Offline / Registered / Ingesting / Healthy / Failed), primary volume label, default branch label. Matches `layer-1-environments.png`. Multi-engine on day one: Postgres, Redis, MongoDB card variants all render.
- **Layer 2 graph**: renders the four-level per-source graph `source → volume → clones → branch chips`, matching `layer-2-graph.png` and `layer-2-with-branches.png`. The volume level collapses when the source has no volume metadata.
- **Lifecycle-event time axis**: renders under the Layer 2 graph. Phase-1 tick inventory: `source_registered`, `clone_requested`, `ingest_started`, `ingest_completed`, `ingest_failed`, `branch_created`. Fixture-sourced in this RFC; live events arrive via RFC 0004.
- **Contextual inspector**: a single component that opens on any Layer 1 or Layer 2 selection and swaps slot sets per selection type (Source / Volume / Clone / Branch). Phase-1 slot inventory per §8.
- **Display types** (§9.2): Zod schemas + inferred TypeScript types for `SourceCard`, `SourceDetail`, `VolumeDetail`, `CloneDetail`, `BranchChip`, `BranchDetail`, `LifecycleEvent`, `InspectorSlotSet`. Exported from the plugin app's public entry.
- **Fixture module** (§9.3): `packages/apps/environments/src/fixtures/` exports a realistic sample dataset covering three sources (PG, Redis, Mongo), multiple clones per source, branches per clone, and a representative lifecycle-event stream. Every state (empty, loading, ready, error) is represented.
- **Storybook stories**: one story file per component, one story per state. Runs via the existing Storybook config.
- **Fixture-backed demo app**: running `pnpm web:dev` shows the shell plugin installed, Layer 1 reachable, Layer 2 reachable for every fixture source, inspector switching per selection. No live data binding, no network calls to RFC 0002 or RFC 0004.
- **Routing**: Layer 1 at `/prj/{slug}/environments`, Layer 2 at `/prj/{slug}/environments/{sourceSlug}`. Flat-short URL (`/env/{sourceSlug}`) is an open question in §15.
- **i18n namespace**: `environments` under `packages/i18n/src/locales/*/environments.json`, covering every user-facing string — card labels, status chips, action buttons, inspector field labels, empty-state copy, toast messages. No hardcoded strings.
- **Schema change**: `is_source boolean not null default false` on `public.datasources`, added via a new numbered schema file. Powers Layer 1's filter.
- **No new RLS policy and no new permission**. The `is_source` column is subject to the existing `datasources_read` policy for reads and the existing `datasources.manage` permission for writes. See §13.

### 3.2 Non-goals (phase 1)

Each non-goal is pinned either to RFC 0004 (the core-behavior sibling) or to a later phase.

- **Any clone-to-node orchestration**. The "clone to node" action on the Layer 2 graph is rendered as a button in phase 1 but clicking it does nothing live — it triggers a fixture state transition for demo purposes only. Real orchestration is **RFC 0004 phase 1**.
- **Any branch-create orchestration**. Same treatment: rendered, interactive against fixtures, not wired. **RFC 0004 phase 1**.
- **Any ingestion code**. No PG logical-replication client, no dump-restore code, no file upload. Ingestion is owned by RFC 0002 (the node contract) and orchestrated by RFC 0004 (the console's side of the wire). **Permanent**, not phased.
- **Any live data binding**. Every component in phase 1 renders from fixtures. `useShell()` is not consumed by the environments app in phase 1. **RFC 0004 phase 1** replaces the fixture adapter with a shell-runtime resource.
- **`environments` as a domain entity**. Never. The word is a UI nickname only. Not a deferred decision — a permanent architectural commitment. See §5.1 and §16.
- **Replication-status inspector panel** (the "Live replication" chip + metric tiles from `layer-2-with-branches.png`). The panel is designed but not implemented; the slot exists in the inspector so **phase 2 (replication)** can drop the panel in without restructuring.
- **Branch History inspector panel** (`layer-2-branch-history.png`). **Phase 3 (commit-level history)**.
- **Data Masking inspector panel** (`layer-2-masking.png`). **Future RFC (data masking)** — a separate feature with its own rule-engine concerns.
- **Per-clone resource metric tiles** (CPU, memory, storage, connections, query rate, latency) visible in `layer-2-graph.png`. The slots exist in the Clone inspector but phase 1 renders them as empty state. **Phase 2 (node observability)**.
- **Lineage section** ("Production (Source) → Staging → …") in the inspector. Implies an environment-labels concept that does not exist yet. **Future RFC (environment labels)**.
- **Prod / staging / dev labels on git-like databases**. Legitimate future feature that happens to share the word "environment". **Future RFC (environment labels)** — separate concept.
- **Branch delete, diff, merge**. Create and list only in phase 1. **RFC 0004 phase 2** (delete), **phase 3** (diff/merge).
- **Per-commit time axis**. Lifecycle events only in phase 1. **Phase 3 (commit-level history)**.

## 4. Prior art in the codebase

- **`datasources`** (`packages/domain/src/entities/datasource.type.ts`, `apps/web/supabase/schemas/22-datasources.sql`) — the qwery-era primitive. Reused as the registration row for a source. The only change this RFC makes is adding `is_source boolean`. Does not replace or fork datasources.
- **Shell app discovery** (`apps/web/src/shell/app-registry.ts`) — Vite-glob registry. Adding `packages/apps/environments` is zero-config, identical to how `packages/apps/notebook` and `packages/apps/integrations` are picked up.
- **`packages/apps/notebook`** and **`packages/apps/integrations`** — structural references for the plugin-app shape (`manifest.ts` + `plugin-root.tsx` + list view + detail view). The integrations app in particular mirrors the Layer-1-list pattern this RFC establishes.
- **`packages/ui`** — Shadcn / Radix primitives this RFC's components are built from (Card, Badge, Tabs, Dialog, Button, Tooltip, Skeleton, etc.). No new UI primitives are introduced — all new components compose existing ones.
- **`packages/i18n`** — the `react-i18next` wrapper. `environments` becomes a new namespace under `packages/i18n/src/locales/*/`. No changes to the i18n infrastructure itself.
- **`packages/shell-runtime`** — referenced but not modified in phase 1. The fixture module lives inside the plugin app in phase 1; RFC 0004 introduces an `environments` resource on `useShell()` that replaces the fixture adapter and consumes the display types from this RFC.
- **Storybook** — the existing setup under `tooling/storybook` (or equivalent) is where phase-1 stories land. No new Storybook config.
- **RFC 0001 (Integrations)** — structurally adjacent. Provides the pattern for "new shell plugin app + new supabase schema file + new i18n namespace". Not a hard dependency.
- **RFC 0002 (Nodes)** — listed for context. Not a phase-1 dependency of this RFC. Becomes relevant in RFC 0004.
- **RFC 0004 (Environments: core behavior)** — the sibling RFC. Drafted after this one is spec'd. This RFC's display types are the UX contract RFC 0004 implements against.

## 5. Conceptual model

### 5.1 No "environment" entity

The word **environment** is a UI nickname for the shell app and the graph it renders. It is not a domain primitive. No table, no entity, no repository port is created for "environment". When this document says "an environment", it means *"a source-role datasource, visually"* — a derived view, never a stored row.

Two rejected alternatives (both in §16): a new `environments` table that owns the source-plus-clones grouping, and a tag on `datasources` elevated to near-entity status. Both would have added a parallel vocabulary next to `datasources`, `nodes`, and git-like databases. Keeping *environments* as a pure UI term avoids that cost. This is a permanent architectural commitment, not a deferred decision.

### 5.2 The four-level graph

Layer 2 is **not** a simple tree. It is a four-level structure: **source → volume → clones → branches** (branches are rendered as chips, not as full graph nodes).

```
Layer 1 (catalogue)                         Layer 2 (selected source)
───────────────────                         ─────────────────────────

┌──────────┐ ┌──────────┐ ┌────┐                  source DB
│ postgres │ │  redis   │ │ …  │                      │
│ primary  │ │  cache   │ │    │                   volume          ← from datasource row
│ ● Online │ │ ● Online │ │    │                      │
│ volume   │ │          │ │    │              ┌───────┼───────┐
│ main     │ │          │ │    │              ▼       ▼       ▼
└──────────┘ └──────────┘ └────┘          clone 1  clone 2  clone 3   ← from RFC 0004 (fixtures in phase 1)
                                              │       │       │
                                            ┌─┴─┐   ┌─┴─┐   ┌─┴─┐
                                            ▼   ▼   ▼   ▼   ▼   ▼
                                          main feat main dev main dev   ← branch chips

                                          ─── lifecycle-event time axis ───→
```

- **Layer 1** is the project-scoped catalogue of `is_source = true` datasources. One card per source.
- **Layer 2** is the per-source graph. The **volume** level is optional: if the source has no volume metadata, Layer 2 collapses it and renders `source → clones → branches` directly.
- **Clones** and **branches** are fixture-backed in this RFC and come from RFC 0004 in the wired-up world.
- The **time axis** is lifecycle-event-based — one tick per event, not one tick per commit. Per-commit rendering is phase 3.

### 5.3 User flow at the visual level (no orchestration)

The phase-1 user flow exists only to drive the component states. It does not describe real system behavior.

1. User opens the environments app. Layer 1 renders the fixture catalogue — three sample sources with assorted statuses.
2. User clicks a source card. Layer 2 renders with the source at the top, its volume below, its clones below that, and branch chips under each clone.
3. User selects the source, a clone, or a branch. The right-hand inspector opens with the appropriate slot set.
4. User clicks "clone to node" on a source. In phase 1 this is a fixture transition: a new clone row appears in `provisioning` state, then after a short fake delay transitions through `ingesting` → `healthy`. **This is a demo path, not a real orchestration.** Real behavior lives in RFC 0004.
5. User clicks "create branch" on a healthy clone. A new branch chip appears under the clone, again via a fixture transition.

The flow is what the components need to render. It is **not** a commitment to any backend behavior — every step above is a prop change in a React component, nothing more.

### 5.4 What belongs where (not this RFC)

| Concept                                                      | Home                                    |
| ------------------------------------------------------------ | --------------------------------------- |
| The shell app, Layer 1, Layer 2, inspector, display types    | **This RFC (RFC 0003)**                 |
| Live orchestration (clone-to-node, create branch, events)    | RFC 0004                                |
| How a source becomes bytes on a node (ingestion protocol)    | RFC 0002 (Nodes)                        |
| How the bytes are versioned                                  | GFS                                     |
| Credentials on a user's cloud account                        | RFC 0001 (Integrations)                 |
| Continuous replication, drift tracking, masking rules        | Future phases                           |
| Prod/staging/dev labels                                      | Future RFC (environment labels)         |
| Cross-node clones, database migration                        | RFC 0002 phase 2+                       |

## 6. Visual language and canonical mockups

All of phase 1 renders against the mockups in `docs/rfcs/0003-environments/`. They are the fixed visual contract. If a component's rendering disagrees with the mockup, the mockup is authoritative and the component is wrong.

- **`layer-1-environments.png`** — the Layer 1 catalogue. Three cards: `postgres-primary` (Online), `redis-cache` (Online), `mongo-docs` (Offline). Each card shows provider icon, name, status chip, primary volume label ("postgres-volume"), default branch label ("main"). Dark theme, grid background, consistent card padding.
- **`layer-2-graph.png`** — the Layer 2 graph for a Postgres source. Source card at top. Volume row below. Two clone cards (`primary`, `replica-1`) side by side, each with a "Live replication" label (phase 2 visual) and a "Data Masking" or "Add masking" affordance (future RFC visual). Right-side inspector: tabs (Overview / Usage / Indexes / Variables / Schema), Connection Info block with a copyable connection string, six metric tiles (CPU / Memory / Storage / Connections / Queries / Latency), Lineage block showing Production (Source) → Staging chain.
- **`layer-2-with-branches.png`** — same graph with branches attached. `prod` and `dev` clones, each with child branch chips (`main`, `feat/auth`, `dev`, `+1`). Right-side inspector variant showing a Service Info header with Running badge, Connection Info, and a Replication Status block with Mode / Replication lag / Last sync / WAL sender rows.
- **`layer-2-branch-history.png`** — right-side variant for Branch History. Listed commit-like entries ("user-2", "prepare for demo", "stream on") with timestamps and status pills. **Phase 3** visual — slot shape must exist, content is empty in phase 1.
- **`layer-2-masking.png`** — right-side variant for Data Masking. Per-field toggles (email, phone, ssn, first_name, address) with an "add rule" affordance at the bottom. **Future RFC** visual — slot shape must exist, content is empty in phase 1.

Phase 1 implements the **shapes and slot layouts** of every inspector variant so future phases can drop in content without restructuring. Phase-1 **content** is only the slots §8.1 lists.

## 7. Layer 1 — catalogue

Layer 1 is a grid of `SourceCard` components. One card per source-role datasource in the current project.

- **Query**: `select * from datasources where project_id = $1 and is_source = true`. Fixture-backed in phase 1.
- **Card anatomy** (matching `layer-1-environments.png`):
  - Provider icon (Postgres elephant, Redis cube, Mongo leaf, etc.).
  - Source name, bold.
  - Status chip — one of `online` (green), `offline` (grey), `registered` (blue), `ingesting` (amber, animated), `healthy` (green), `failed` (red).
  - Primary volume label — from the datasource row (or fixture).
  - Default branch label — from the datasource row (or fixture), typically `main`.
- **Interaction**: clicking a card navigates to Layer 2 for that source.
- **States**: loading (skeleton), empty (zero cards), error, ready. All four have Storybook stories.
- **Multi-engine**: any provider string the `datasources` table supports renders. Unknown providers fall back to a generic icon and render the card normally. Non-PG sources are visually indistinguishable from PG sources except for their icon — phase 1 does not visually downgrade "not yet ingest-enabled" cards (per §15 open question 4).

## 8. Layer 2 — per-source graph + inspector

### 8.1 Graph canvas

- **Renderer**: custom SVG (hand-rolled) or a graph library — decision deferred to §15 open question 1. The decision affects implementation but not the display types or the component shape.
- **Layout**: `source → volume → clones → branch chips`, top-to-bottom, one column per clone.
- **Volume row**: optional. Collapsed when the source has no volume metadata.
- **Clone card anatomy**: name, status chip, a "Live replication" or equivalent slot chip (empty in phase 1), a child row of branch chips, an "Add branch" affordance.
- **Branch chip**: compact name + tiny status dot. Clicking opens the Branch inspector.
- **Time axis**: horizontal strip below the graph. One tick per lifecycle event, ordered chronologically. Tooltip on hover shows event type and timestamp.

### 8.2 Inspector slot inventory (phase 1)

The inspector is a single `ContextualInspector` component that swaps slot sets per selection type. Phase-1 slot inventory:

- **Source selected** — provider icon + name, status chip, connection string (masked), volume label, default branch label, "Clone to node" action (button; triggers fixture transition in phase 1).
- **Volume selected** — volume label, size (empty slot in phase 1), "clones on this volume" count.
- **Clone selected** — node name (fixture), status chip, connection string, six empty metric slots (CPU / Memory / Storage / Connections / Queries / Latency — phase 2 fills them), empty lineage slot (future RFC fills it), "Create branch" action (button; fixture transition).
- **Branch selected** — parent clone name, branch name, creation timestamp, empty Branch History slot (phase 3 fills it).

Every slot set that is visible in the mockups but not in the phase-1 inventory — Replication Status, Data Masking, Branch History content, metric tiles content, Lineage content — is implemented as **an empty slot whose component layout exists**. Future RFCs drop content into the existing slot; no restructuring is needed.

### 8.3 Empty, loading, and error states

- **Empty**: illustrations + short copy + a primary action where appropriate. Every list / graph / inspector has an empty-state story.
- **Loading**: skeletons using `@qlm/ui/skeleton` (or equivalent). Full-card skeletons for Layer 1; graph-level skeleton for Layer 2.
- **Error**: inline error component with a short human-readable message and a retry action. Always localized.
- **Phase-1 open slots** (metric tiles, lineage, etc.): render nothing (hidden), **not** placeholder dashes or "coming soon" badges. See §15 open question 5.

## 9. Component contract and display types

### 9.1 Component inventory

Every component in this list ships in phase 1, with a Storybook file and stories for every state.

- `SourceCard` — Layer 1 card.
- `SourceCardGrid` — Layer 1 grid container.
- `Layer1View` — Layer 1 page component (grid + empty/loading/error states + header).
- `Layer2Graph` — Layer 2 canvas.
- `GraphSourceNode`, `GraphVolumeNode`, `GraphCloneNode`, `GraphBranchChip` — the individual graph elements.
- `LifecycleEventAxis` — the time axis.
- `Layer2View` — Layer 2 page component (graph + axis + inspector shell + empty/loading/error states + header).
- `ContextualInspector` — the right-side inspector shell.
- `InspectorSourceSlots`, `InspectorVolumeSlots`, `InspectorCloneSlots`, `InspectorBranchSlots` — per-selection slot sets.
- `StatusChip` — the shared status-chip primitive (or a thin wrapper around `@qlm/ui/badge`).
- `ConnectionStringField` — masked connection string with copy button.
- `EmptySlot` — the "reserved but unfed" slot component used throughout the inspector.

Every component is a function component, uses `Readonly<Props>`, localizes every string via `t(...)` or `@qlm/ui/trans`.

### 9.2 Display types

The UX contract is a set of Zod schemas and inferred TypeScript types exported from `packages/apps/environments/src/types/`. These types are what Storybook stories, fixtures, and (in RFC 0004) the shell-runtime resource all agree on.

Top-level types (schemas + `z.infer`):

- `SourceStatus` — union of `'online' | 'offline' | 'registered' | 'ingesting' | 'healthy' | 'failed'`.
- `SourceCard` — what a Layer 1 card needs: `id`, `name`, `providerSlug`, `status`, `volumeLabel`, `defaultBranchLabel`.
- `SourceDetail` — what Layer 2 needs at the root: `SourceCard` plus `connectionStringMasked`, `registeredAt`, `createdBy`.
- `VolumeDetail` — optional volume node: `id`, `label`, `sizeBytes?`.
- `CloneDetail` — `id`, `name`, `status`, `nodeLabel`, `connectionStringMasked`, `createdAt`, `branches: BranchChip[]`.
- `BranchChip` — `id`, `name`, `status`.
- `BranchDetail` — `BranchChip` plus `parentCloneId`, `createdAt`, `createdBy`.
- `LifecycleEventType` — union of `'source_registered' | 'clone_requested' | 'ingest_started' | 'ingest_completed' | 'ingest_failed' | 'branch_created'`.
- `LifecycleEvent` — `id`, `type: LifecycleEventType`, `timestamp`, `subjectId`, `message?`.
- `EnvironmentGraph` — the top-level shape Layer 2 renders: `source: SourceDetail`, `volume?: VolumeDetail`, `clones: CloneDetail[]`, `events: LifecycleEvent[]`.

These types are the **UX contract**. RFC 0004's shell-runtime resource is responsible for producing data shaped like them. The display types belong to the UX RFC because they describe what the UI renders, not what the domain manipulates — the domain boundary lives one layer deeper and is RFC 0004's concern.

### 9.3 Fixture module and Storybook

- **Fixture location**: `packages/apps/environments/src/fixtures/`. Three files: `sources.fixture.ts`, `graph.fixture.ts`, `events.fixture.ts`. Each exports a realistic sample dataset shaped by the display types above.
- **Demo dataset**: three sources (`postgres-primary`, `redis-cache`, `mongo-docs`), two clones per source, two branches per clone, ~12 lifecycle events spanning all six types.
- **Fixture adapter**: a thin `useFixtureEnvironmentGraph(sourceId)` hook inside the plugin app returns the `EnvironmentGraph` for a given source. RFC 0004 replaces this hook with a `useShell()` call that returns the same shape.
- **Storybook stories**: one story file per component, one story per state. Shared decorators wrap each story with the existing i18n provider and (where needed) a fake project context.
- **No network calls**: phase-1 components do not import from `@qlm/shell-runtime`. The only imports are `@qlm/ui/*`, `@qlm/i18n`, `react`, `@tanstack/react-router`, and the local fixture module.

## 10. Shell placement, routing, and i18n

### 10.1 Shell plugin

- New package `packages/apps/environments` with `src/manifest.ts` and `src/plugin-root.tsx`, following the shape of `packages/apps/notebook` and `packages/apps/integrations`.
- `manifest.ts` exports a `PluginManifest` declaring the nav entry and routes.
- `plugin-root.tsx` default-exports `Layer1View` and exports `FlatRoot` as `Layer2View`.
- Auto-discovered by `apps/web/src/shell/app-registry.ts` — no host changes.

### 10.2 Routing

- `/prj/{projectSlug}/environments` — Layer 1.
- `/prj/{projectSlug}/environments/{sourceSlug}` — Layer 2.
- Flat short URL `/env/{sourceSlug}` following the notebook pattern — **open question §15 Q2**. Proposed: yes.

### 10.3 i18n

- New namespace `environments` under `packages/i18n/src/locales/*/environments.json`, created for every locale already present.
- Every user-facing string goes through `t(...)` or `@qlm/ui/trans`. No hardcoded English. ESLint enforces `@qlm/ui/trans` over `react-i18next/Trans`.
- Key groups (non-exhaustive): `environments.layer1.*`, `environments.layer2.*`, `environments.inspector.*`, `environments.status.*`, `environments.actions.*`, `environments.empty.*`, `environments.errors.*`, `environments.events.*`.

## 11. Display-time data model

This RFC's **total schema footprint is one boolean column**.

```
alter table public.datasources
  add column if not exists is_source boolean not null default false;
```

- Added via a new numbered schema file (next number after `35-integration-connections.sql`).
- No backfill: default `false`. Existing datasources remain invisible to Layer 1 until explicitly flipped.
- Layer 1's query is literally `select * from datasources where project_id = $1 and is_source = true`.

No other tables, no new enum values, no new join tables. Clones, branches, lifecycle events are the core RFC's concern — in phase 1 they are fixture-only; in RFC 0004 they are the responsibility of whatever shape RFC 0002 publishes.

## 12. Security

- **RLS**: `is_source` is a column on `datasources`. Reads go through the existing `datasources_read` policy. Writes (flipping the boolean) go through the existing `datasources.manage` permission. **No new policy, no new permission.**
- **Source credentials**: out of scope for phase 1. The fixture adapter never holds credentials. When RFC 0004 adds live data, credentials stay on the server side via whatever `datasources` already uses.
- **No egress**: phase 1 does not call any external network. Everything is local fixture data.
- **No new actions**: the "Clone to node" and "Create branch" buttons in phase 1 are cosmetic — they trigger React state changes against fixtures. No network call is made.

## 13. Rollout plan

| Phase | Scope                                                                                                               | Artifacts              | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| 1     | Shell app scaffold, Layer 1, Layer 2 (graph + inspector shell + axis), display types, fixture module, Storybook, routing, i18n, `is_source` column. Fixture-backed; no live data; no orchestration. | This RFC + phase-1 spec | Draft  |
| 2     | **Inspector variants for future data**: replication-status slots wired (when RFC 0004 phase 2 lands), per-clone metric tiles wired (depends on node observability surface in RFC 0002), empty-state polish. | Phase 2 RFC            | Future |
| 3     | **Per-commit time axis + Branch History panel**. Depends on RFC 0002 exposing a commit list.                       | Phase 3 RFC            | Future |
| 4     | **Multi-engine Layer 1 polish**. As RFC 0004 adds engine support, Layer 1 gains engine-specific affordances.        | Phase 4 RFC            | Future |
| 5     | **Data Masking panel**. Separate future RFC — not scheduled against an environments UX phase; listed here for traceability of the mockup. | Future RFC             | Future |

Each phase is an independent RFC. RFC 0004 (core behavior) is **drafted after this RFC is spec'd** — that is the sequential relationship the two RFCs maintain. Phase 2 of this UX RFC cannot start before RFC 0004 phase 1 lands because the inspector's live slots need live data.

## 14. Open questions

Questions closed in Rounds 1–3 of the pre-split `/draft-rfc` session (preserved for traceability):

- **R1/Q1** No `environments` domain entity.
- **R1/Q2** Vocabulary stays as a UI-only nickname.
- **R1/Q3** Layer 1 lists only source-role datasources.
- **R1/Q4** Hard dep on Nodes; soft dep on Integrations — both have **moved to RFC 0004** along with the orchestration story. This UX RFC has zero hard dependencies.
- **R2/Q1 – R2/Q4** Ingestion path, sync model, branch-UX breadth, time-axis depth — all moved to RFC 0004's concern. This UX RFC only commits to rendering the states, not to when or how they arrive.
- **R3/Q1** Source-role tag = `is_source boolean not null default false`. Single-column change. Kept in this RFC.
- **R3/Q2 – R3/Q4** Backup upload, console-side storage, ingester location — all resolved against RFC 0004 by being removed from scope. Kept out of this RFC.

Remaining questions for this UX RFC:

1. **Graph renderer.** Custom SVG, `reactflow`, `@xyflow/react`, D3, or plain divs with CSS positioning? Affects implementation complexity, accessibility, and animation options. The display types and component shapes are renderer-agnostic, so this can be deferred to the spec, but a decision is needed before implementation starts. **Proposal**: custom SVG — the graph has few nodes and tight visual requirements that drag-and-drop libraries don't serve well.
2. **Flat short URL for Layer 2.** Should Layer 2 be shareable via `/env/{sourceSlug}` mirroring `/notebook/{slug}`? **Proposal**: yes, consistent with existing UX. Spec makes the call.
3. **Fixture module location.** Inside the plugin app (`packages/apps/environments/src/fixtures/`) or in a shared package so RFC 0004's integration tests can reuse them? **Proposal**: inside the plugin app in phase 1; extract to a shared package only if RFC 0004 needs them.
4. **Non-PG cards in Layer 1.** The mockups show Redis and MongoDB cards. In phase 1 (fixtures), they render identically to PG cards. In RFC 0004, when real data arrives, should non-PG cards visually indicate "registered but not yet clone-enabled" (e.g. a muted "Clone to node" button) or be identical to PG cards with the action failing downstream? **Proposal**: identical rendering; RFC 0004 decides the action-side UX.
5. **Empty-slot behavior in the inspector.** For slots that exist in the component but have no phase-1 content (metric tiles, lineage, data-masking, replication-status): (a) hide entirely, (b) render a muted "—" placeholder, or (c) render a "coming soon" affordance. **Proposal**: (a) hidden — avoids UI noise and avoids promising specific future work in the chrome. The slot *layout* exists so future RFCs can drop content in without restructuring; the slot *rendering* is conditional on having content.
6. **Status chip color map.** Six statuses — `online`, `offline`, `registered`, `ingesting`, `healthy`, `failed`. Are `online` and `healthy` both green, distinguished only by text? Or do they want distinct visual weights? **Proposal**: `online` and `healthy` both green; `ingesting` amber; `failed` red; `registered` and `offline` grey. Spec confirms against the design system.
7. **Storybook story granularity.** One story per state, or one story per component with controls for state? **Proposal**: one per state — easier to review visually, cheaper to write, matches existing Storybook practice in the repo.

## 15. Alternatives considered

- **`environments` as a first-class domain entity.** Rejected in Round 1. A new table, a new `IEnvironmentRepository`, a new `EnvironmentEntity` sitting next to `datasources` and nodes. Permanent architectural cost for no permanent benefit. Kept out here; inherited by RFC 0004 as a standing rule.
- **Environments as a role / tag elevated to near-entity status on `datasources`.** Rejected in Round 1. A tag is fine for filtering; promoting it to a concept with services and repositories recreates the first alternative with extra indirection.
- **Rename to "Sources" everywhere.** Considered in Round 1. Rejected because the product team already uses the term "environments" and switching vocabulary mid-design loses more than it gains. §5.1 commits to the UI-only nickname.
- **Pivot the concept to prod/staging/dev labels.** Rejected. Legitimate future feature; different concept. Reusing the word "environment" for both would force either the wrong design or two meanings of the same word.
- **Layer 1 also lists top-level QLM databases with no source.** Rejected in Round 1. Mixes two lifecycles in one view.
- **Ship this RFC and the core-behavior RFC as a single combined RFC.** Rejected at the split decision. Combined, the RFC hard-depended on RFC 0002's unpublished control-plane contract, which meant the phase-1 spec could not be written — the exact drift vector `/rfc-to-spec` exists to prevent. Splitting along UX/behavior lines lets this RFC go to spec immediately and unblocks frontend work; RFC 0004 waits for its dependency and is drafted sequentially after.
- **Implement the UX as Storybook-only until RFC 0004 lands.** Rejected. Storybook-only loses the "click through the app with fake data" demo value. Fixture-backed plugin means designers and PMs can review the whole experience during phase 1; Storybook is for component-level review, the app is for flow-level review. Both ship.
- **Implement the UX as an app with "coming soon" placeholders** (shell scaffold, navigation, but no real components). Rejected. Has the same cost as fixture-backed but produces nothing reviewable. The whole point of the split is that the UX delivers visible progress in isolation from wiring.
- **Drop the `is_source` column and make Layer 1 list every datasource.** Rejected. Conflates "a datasource I use as a qwery query target" with "a datasource I want to ingest into QLM". Users would see every connection string they have ever entered under the environments app, which is wrong both conceptually and visually.
- **Put the display types in `packages/domain`.** Rejected. Display types describe what the UI renders, not what the domain manipulates. Domain entities are the concern of RFC 0004 and map to these display types at the shell-runtime boundary. Keeping them in the plugin app avoids contaminating the domain layer with presentation concerns.
- **Use `reactflow` or `@xyflow/react` for the graph.** Deferred to §14 Q1. Neither accepted nor rejected — it is a legitimate implementation option that trades flexibility for weight.

## 16. References

- `.claude/rules/architecture.md` — shell plugin discovery pattern, monorepo layout.
- `.claude/rules/hexagonal-architecture.md` — layering rules this design is measured against.
- `.claude/rules/clean-code.md` — naming, component size, readonly props.
- `.claude/rules/i18n.md` — string-handling rules enforced by ESLint.
- `.claude/rules/database.md` — RLS and migration conventions for the `is_source` column.
- `.claude/rules/conventions.md` — import ordering, Prettier, file conventions.
- `.claude/rules/spec-driven-dev.md` — RFC / spec / story / task structure and the sequential-RFC pattern this document adopts.
- `docs/rfcs/0001-integrations.md` — structural reference for "new shell plugin app + new supabase schema file + new i18n namespace".
- `docs/rfcs/002-nodes.md` — listed for context; not a phase-1 dependency of this RFC.
- `docs/rfcs/0004-environments-core-behavior.md` — the sibling core-behavior RFC; drafted after this one is spec'd.
- `docs/rfcs/0003-environments/layer-1-environments.png` — canonical Layer 1 mockup.
- `docs/rfcs/0003-environments/layer-2-graph.png` — canonical Layer 2 graph + inspector mockup.
- `docs/rfcs/0003-environments/layer-2-with-branches.png` — Layer 2 with branches + phase-2 replication-status inspector variant.
- `docs/rfcs/0003-environments/layer-2-branch-history.png` — phase-3 Branch History inspector variant.
- `docs/rfcs/0003-environments/layer-2-masking.png` — future Data Masking inspector variant.
- `apps/web/src/shell/app-registry.ts` — Vite-glob app discovery; auto-picks up `packages/apps/environments`.
- `packages/apps/notebook/src/manifest.ts`, `plugin-root.tsx` — structural reference for the new plugin app.
- `packages/apps/integrations/*` — structural reference for a Layer-1-style list-view plugin.
- `packages/domain/src/entities/datasource.type.ts`, `apps/web/supabase/schemas/22-datasources.sql` — the datasource primitive the `is_source` column lands on.
- `packages/ui/*` — Shadcn primitives the new components compose.
- `packages/i18n/*` — react-i18next wrapper; new `environments` namespace lands here.

---

### Review checklist for the author

- [ ] Does §1 make the UX-only scope obvious and state the sequential relationship with RFC 0004?
- [ ] Is every §3.1 goal an observable exit criterion that can be satisfied by a phase-1 pull request?
- [ ] Is every §3.2 non-goal pinned to RFC 0004, a later phase of this RFC, or a future RFC?
- [ ] Does §5.1 commit, permanently, to "environment" as a UI-only nickname?
- [ ] Does §5.2 describe the four-level graph (source → volume → clones → branches) and the volume level's optionality?
- [ ] Does §6 reference every mockup file and describe the subset each is authoritative for?
- [ ] Does §8 define both the phase-1 inspector slot inventory and the empty-slot behavior policy?
- [ ] Does §9 define display types as the UX contract RFC 0004 inherits?
- [ ] Is the fixture-backed phase-1 approach explicit in §9.3 and in the goals?
- [ ] Does §11 limit the schema footprint to one column?
- [ ] Are the open questions in §14 genuine decisions, not placeholders?
- [ ] Does §15 list the split-into-two-RFCs decision and the rejected alternatives to it?
