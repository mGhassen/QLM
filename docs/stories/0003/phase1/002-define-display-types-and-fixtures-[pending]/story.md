---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#51-data-shapes"
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
status: pending
started: null
finished: null
blocks:
  - "005-build-shared-primitives-and-source-card"
  - "007-build-layer-2-graph-components"
  - "008-build-contextual-inspector"
blocked_by:
  - "001-scaffold-environments-packages"
---

# Define display types and fixtures

## Goal

Ship all Zod display-type schemas (reusing `DatasourceSchema` from `@guepard/domain/entities` for source-side types so there is zero drift from `public.datasources`) and the fixture module + adapter hooks so every component has a typed contract and realistic sample data to render against.

## Scope

**In scope**

- `src/types/index.ts` — type barrel.
- `src/types/source-status.ts` — view-only `SourceStatus` enum + schema. Inline comment labels it as **not** a column on `public.datasources`.
- `src/types/source-card.ts` — `SourceCardSchema` built as `DatasourceSchema.pick({ id, projectId, slug, name, datasource_provider, datasource_kind }).extend({ status, volumeLabel, defaultBranchLabel })`. Imports `DatasourceSchema` from `@guepard/domain/entities`.
- `src/types/source-detail.ts` — `SourceDetailSchema` built as `DatasourceSchema.extend({ status, volumeLabel, defaultBranchLabel, connectionStringMasked })`. Inherits `description`, `config`, timestamps, `isPublic`, `remixedFrom`, `datasource_driver`, `datasource_kind`, `datasource_provider` from the entity.
- `src/types/volume-detail.ts`, `src/types/clone-detail.ts`, `src/types/branch-chip.ts`, `src/types/branch-detail.ts` — greenfield node-side display contracts (no DB drift possible — nothing in the v3 schema carries these concepts).
- `src/types/lifecycle-event.ts` — `LifecycleEventType` enum (6 types) + `LifecycleEventSchema`.
- `src/types/environment-graph.ts` — top-level `EnvironmentGraphSchema` composing source + volume + clones + events.
- `src/types/graph-selection.ts` — discriminated union for inspector selection.
- `src/fixtures/index.ts` — fixture barrel.
- `src/fixtures/sources.fixture.ts` — `FIXTURE_SOURCES: SourceCard[]` with three realistic entries: `postgres-primary`, `redis-cache`, `mongo-docs`. Fields match the `Datasource` entity shape exactly.
- `src/fixtures/graph.fixture.ts` — `buildFixtureGraph(sourceSlug: string): EnvironmentGraph` returning source + volume + 2 clones + branches + a representative event stream.
- `src/fixtures/events.fixture.ts` — helper that builds a `LifecycleEvent[]` spanning all 6 event types.
- `src/fixtures/use-fixture-sources.ts` — React hook: `useFixtureSources(projectSlug): { sources, isLoading, error, retry }`. Synchronous in phase 1, `isLoading` always `false` unless `?demo=loading` URL param is set.
- `src/fixtures/use-fixture-environment-graph.ts` — React hook returning a **static** graph for a given sourceSlug. Fixture state transitions (clone-to-node, create-branch) are added in Story 009; this story just gets the hook skeleton in place with static data.
- Schema validation tests: one Vitest file per type ensuring `Schema.parse(fixtureValue)` succeeds for every fixture used.

**Out of scope** (forces honest slicing)

- A `SourceProvider` enum — explicitly not created. `datasource_provider` is free-form `text`, matching the existing column.
- Extending `DatasourceSchema` with the `is_source` field — that belongs to Story 004 alongside the column migration.
- Any React components that consume these types (→ Stories 005–009).
- Fake clone-to-node and create-branch state transitions (→ Story 009).
- Any i18n keys (→ Story 003).

## Acceptance criteria

- [ ] `SourceCardSchema` and `SourceDetailSchema` both `import { DatasourceSchema } from '@guepard/domain/entities'` and build via `.pick(...)` / `.extend(...)`. No hand-rolled duplication of column names.
- [ ] No file in `packages/features/environments/src/types/` defines a `SourceProvider` enum.
- [ ] No field in the source-side types uses a name that already exists on `public.datasources` under a different spelling (e.g. no `provider` alongside `datasource_provider`).
- [ ] Every view-only field (`status`, `volumeLabel`, `defaultBranchLabel`, `connectionStringMasked`) has an inline comment stating it is **not persisted** and naming where it comes from (phase 1 fixture / RFC 0004 node-side).
- [ ] `FIXTURE_SOURCES` and the output of `buildFixtureGraph(...)` pass `SourceCardSchema.parse(...)` / `EnvironmentGraphSchema.parse(...)` at test time.
- [ ] `pnpm typecheck` passes across `@guepard/environments` — confirming `.pick(...)` / `.extend(...)` resolves correctly against the current `DatasourceSchema`.
- [ ] All types are exported from the package root via `@guepard/environments/types`.
- [ ] `useFixtureSources` and `useFixtureEnvironmentGraph` are both exported from `@guepard/environments/fixtures` and are the only path Story 006 / Story 009's plugin-root imports need.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

```bash
pnpm --filter @guepard/environments typecheck
pnpm --filter @guepard/environments test
# Optional: in a scratch file, import the types + fixtures and log them
# import { FIXTURE_SOURCES, buildFixtureGraph } from '@guepard/environments/fixtures';
# import { SourceCardSchema, EnvironmentGraphSchema } from '@guepard/environments/types';
# console.log(SourceCardSchema.parse(FIXTURE_SOURCES[0]));
# console.log(EnvironmentGraphSchema.parse(buildFixtureGraph('postgres-primary')));
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
