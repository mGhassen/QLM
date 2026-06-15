---
spec: docs/specs/0026-node-state-decomposition-phase1.md
spec_sections:
  - "#3-functional-flow"
  - "#4-technical-flow"
  - "#5-api-contracts"
  - "#72-adapters"
  - "#73-server-appsserver"
  - "#74-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-pkg-packagesfeaturesopsinfrastructure"
  - "#76-topology-packagesfeaturesopstopology"
  - "#77-domain--pool"
status: done
started: 2026-04-27
finished: 2026-04-27
blocks: ["003-drop-deprecated-status"]
blocked_by: ["001-domain-db-additive"]
---

# Switch adapters + presentation onto the new five-axis state

## Goal

Adapters write the new fields, presentation reads them, the per-node detail surfaces drain/eligibility/lifecycle as first-class, and topology pool aggregations stop conflating operator intent with observed state. The legacy `lifecycle_status` column becomes a SQL-trigger-maintained projection of the new fields — application code never writes it directly. UI reads only the new model.

## Scope

**In scope**

- **SQL migration FIRST** (task 1): `apps/web/supabase/schemas/48-node-legacy-status-trigger.sql` — `sync_legacy_status_from_new_fields()` plpgsql function with deterministic precedence (RFC §7.2 / spec §6.1b), `BEFORE INSERT OR UPDATE` trigger on `public.node`, plus `pool_view` updated to expose `lifecycle_*_count` + `health_{healthy,degraded,critical,unknown}_count` columns. Run `pnpm supabase:web:reset && pnpm supabase:web:typegen`.
- Supabase + HTTP node adapters: implement `setLifecycle`, `setEligibility`, `setDrain`. Map the four enum tables. Read + populate `node.drain` via JOIN with `public.node_drain`. Compute `node.health` via `deriveNodeHealth(...)` on read for single-node paths.
- Adapters write the new fields only — legacy `lifecycle_status` is auto-maintained by the trigger; no application code reads or writes it during this story (or after).
- DrainNodeService accepts `setIneligibleOnStart: boolean` (default `true`); operator may drain without flipping eligibility.
- Server routes: 4 new POST endpoints (`/drain`, `/drain/cancel`, `/eligibility`, `/lifecycle`) per spec §5.2. zValidator schemas. Tests cover happy + 400 + 404 + 409.
- Shell-runtime: add `shell.nodes.drain`, `.drainCancel`, `.setEligibility`, `.setLifecycle`. Each invalidates `nodes.detail`, `nodes.list`, `fleet.summary`, `fleet.pools`, `fleet.pressure`.
- MSW handlers: extend `nodes.ts` to handle the new endpoints with the same in-memory store. Drain countdown is synthetic.
- Presentation: new `getNodeDisplayState(node)` lib + tests. `HealthStatusBadge` consumes it. New `DrainDialog`, `DrainBanner`, `EligibilityChip` components + storybook stories. Detail-page action row replaces today's status buttons.
- Topology: pool card distribution bar reads `healthCounts`; new lifecycle dot row. Fleet summary distribution + pressure list use new vocabulary. `topology/application/constants.ts` rename `STATUS_*` → `HEALTH_*` + add `LIFECYCLE_*`.
- Pool entity: add `lifecycleCounts` + `healthCounts`. `pool_view` SQL emits both. Supabase + HTTP adapter + MSW pool handler aggregate the new counts. `FleetAggregateService` reads them.
- `PressurePoint.kind` vocabulary expanded per spec §5.6.
- i18n: nodes.json + topology.json gain new keys per spec §11.
- E2E test `apps/web/e2e/node-drain.spec.ts`.

**Out of scope**

- Bulk drain / bulk eligibility — phase 2.5.
- Audit log entries — phase 6.
- Dropping the trigger / old `status` field / `lifecycle_status` column — story 003.

## Acceptance criteria

- [ ] All four new endpoints respond 200 / 400 / 404 / 409 per server tests.
- [ ] `shell.nodes.drain({...})` works end-to-end against MSW. Detail page banner appears with countdown when `drain.deadline` is set.
- [ ] `getNodeDisplayState` precedence matrix tests green (full table per spec §5.4).
- [ ] `HealthStatusBadge` no longer references `node.status`. `grep -rn "node.status\b" packages/features/ops/infrastructure/src` returns zero hits in phase-2 surfaces (legacy callers may still reference for compat — not blocking).
- [ ] Topology pool card renders health distribution + lifecycle dots. No reference to the old `statusCounts` in topology presentation files.
- [ ] `pool_view` SQL exposes `lifecycle_counts` + `health_counts`. After `pnpm supabase:web:typegen`, generated types reflect them.
- [ ] `FleetAggregateService.summary` returns `healthCounts` + `lifecycleCounts`; old `statusCounts` is computed only as a transitional convenience and gated by a comment marking it for deletion in story 003.
- [ ] E2E `node-drain.spec.ts` passes: open detail → drain → countdown → cancel → eligibility chip flips back.
- [ ] `pnpm typecheck && pnpm test && pnpm --filter @qlm/infrastructure storybook` green.
- [ ] `hex-architecture-reviewer` agent passes (domain stays pure; orchestration writes only in adapters/server).

## Tasks

1. [001-sql-trigger-and-pool-view](001-sql-trigger-and-pool-view-pending.md)
2. [002-supabase-adapter-new-mutations](002-supabase-adapter-new-mutations-pending.md)
3. [003-http-adapter-new-mutations](003-http-adapter-new-mutations-pending.md)
4. [004-server-routes-and-tests](004-server-routes-and-tests-pending.md)
5. [005-runtime-resource-mutations](005-runtime-resource-mutations-pending.md)
6. [006-msw-handlers-drain](006-msw-handlers-drain-pending.md)
7. [007-presentation-display-state-badge-and-drain](007-presentation-display-state-badge-and-drain-pending.md)
8. [008-topology-pool-aggregations-and-e2e](008-topology-pool-aggregations-and-e2e-pending.md)

## Demo / verification

```bash
pnpm typecheck && pnpm test && pnpm build
pnpm dev
# /node/<id> → Drain → 30m deadline → confirm; observe banner + countdown
# /node/<id> → eligibility chip click → flips ineligible / eligible
# /topology → pool card now shows health distribution + lifecycle dot row
# /topology → pressure list uses new kind labels (unreachable, failing, ...)
pnpm --filter @qlm/infrastructure storybook
pnpm --filter web e2e e2e/node-drain.spec.ts
```

## Questions surfaced

(none yet)
