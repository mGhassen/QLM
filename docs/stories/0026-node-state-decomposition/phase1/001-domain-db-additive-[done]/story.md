---
spec: docs/specs/0026-node-state-decomposition-phase1.md
spec_sections:
  - "#5-conceptual-model"
  - "#6-data-model"
  - "#71-domain-packagesdomain"
status: pending
started: null
finished: null
blocks: ["002-adapter-presentation-switchover"]
blocked_by: []
---

# Add five-axis Node state to domain + DB (additive)

## Goal

Add `lifecycle / orchestration / eligibility / drain / health` to the domain `Node` entity + DB schema without breaking existing `status` consumers. Backfill from `lifecycle_status`. Dual-state period begins; nothing reads the new fields yet (story 0026-002 flips reads).

## Scope

**In scope**

- Three new Postgres enums: `node_lifecycle_state`, `node_orchestration_state`, `node_eligibility_state`.
- Four new columns on `public.node`: `lifecycle`, `orchestration`, `eligibility`. (Health is computed, not stored.)
- New table `public.node_drain` (1:1 with node) with RLS policies inheriting from `public.node` ownership.
- Backfill UPDATE mapping `lifecycle_status` → new fields per spec §1 q6.
- New schema file `apps/web/supabase/schemas/47-node-state-decomposition.sql`. Run `pnpm supabase:web:reset && pnpm supabase:web:typegen`.
- Domain Zod schemas: extend `NodeSchema` with the new fields (optional during migration). Add `NodeDrainSchema`. Export new enum constants.
- Domain DTOs: `DrainNodeInput`, `DrainCancelInput`, `SetEligibilityInput`, `SetLifecycleInput` in `node-usecase-dto.ts`.
- Domain services: `DrainNodeService`, `DrainCancelNodeService`, `SetNodeEligibilityService`, `SetNodeLifecycleService`. Pure helper `deriveNodeHealth(node, runtimeState, now)`.
- Repository port additions: abstract `setLifecycle`, `setEligibility`, `setDrain` on `INodeRepository`.
- Domain unit tests for each service + `derive-health.test.ts` covering the threshold matrix.
- ESLint custom rule `no-orchestration-write` scaffolded in `tooling/eslint/rules/`. Wire into `tooling/eslint/react.js`. Allowlist: `packages/repositories/**`, `apps/server/**`. Severity: error.

**Out of scope**

- Adapter implementations of new repo methods — story 002.
- HTTP adapter, server routes, runtime resource — story 002.
- Presentation changes — story 002.
- Dropping the old `status` field or `lifecycle_status` enum — story 003.
- `pool_view` / `Pool.statusCounts` rewrite — story 002.

## Acceptance criteria

- [ ] `apps/web/supabase/schemas/47-node-state-decomposition.sql` exists. After `pnpm supabase:web:reset && pnpm supabase:web:typegen`, `Database['public']['Tables']['node_drain']` exists in generated types and the four new columns are visible on `node`.
- [ ] Backfill leaves zero NULL values in `lifecycle / orchestration / eligibility` (verified by SQL `SELECT COUNT(*) FROM public.node WHERE lifecycle IS NULL`).
- [ ] `NodeSchema.parse(row)` succeeds for every seeded fixture.
- [ ] `NodeDrainSchema.parse(...)` round-trips happy + edge cases (no deadline, force, ignoreSystemJobs).
- [ ] Domain test count: ≥ 8 for the four new services + ≥ 6 for `derive-health.test.ts` boundary matrix. All green.
- [x] ESLint `no-orchestration-write` exercised by RuleTester suite at `packages/domain/__tests__/eslint/no-orchestration-write.test.ts` — 4 valid (adapter/server allowlisted, lifecycle/eligibility writes ignored) + 3 invalid (UI, web/lib, shell-runtime) cases, all green. Replaces the originally planned dormant fixture file.
- [ ] `pnpm typecheck` + `pnpm test` green.
- [ ] Existing `status` field on `Node` and existing `node.changeStatus` repository method still work — no consumer breaks.

## Tasks

1. [001-add-domain-types](001-add-domain-types-pending.md)
2. [002-add-domain-services-and-tests](002-add-domain-services-and-tests-pending.md)
3. [003-add-derive-health-helper](003-add-derive-health-helper-pending.md)
4. [004-extend-repo-port](004-extend-repo-port-pending.md)
5. [005-add-sql-schema-and-backfill](005-add-sql-schema-and-backfill-pending.md)
6. [006-regen-types-verify](006-regen-types-verify-pending.md)
7. [007-add-eslint-no-orchestration-write](007-add-eslint-no-orchestration-write-pending.md)

## Demo / verification

```bash
pnpm typecheck && pnpm test
pnpm --filter @qlm/domain test __tests__/services/node
pnpm supabase:web:reset && pnpm supabase:web:typegen
psql "$LOCAL_SUPABASE_URL" -c "SELECT COUNT(*) FROM public.node WHERE lifecycle IS NULL;"
psql "$LOCAL_SUPABASE_URL" -c "SELECT * FROM public.node_drain LIMIT 5;"
pnpm --filter @qlm/domain test __tests__/eslint   # RuleTester proves no-orchestration-write fires + allowlist works
```

## Questions surfaced

(none yet)

## Open verification (deferred to story 002 boot)

- Live `psql` assertion `SELECT COUNT(*) FROM public.node WHERE lifecycle IS NULL` not yet run — local Supabase was down at story-001 close. The schema CASE branches always populate (no `NULL` lifecycle/orchestration/eligibility possible); confirm-on-boot for story 002 once `pnpm supabase:web:start && pnpm supabase:web:reset` completes.
