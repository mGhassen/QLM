---
story: ./story.md
status: pending
layer: db
model: sonnet
files:
  - apps/web/supabase/schemas/49-node-state-cleanup.sql
  - apps/web/supabase/schemas/48-node-legacy-status-trigger.sql
  - apps/web/supabase/schemas/46-platform-pools.sql
  - apps/web/supabase/migrations/20260427201748_node-legacy-status-trigger.sql
  - packages/supabase/src/database.types.ts
validation:
  kind: typecheck-only
---

# Schema 49: drop trigger + function + lifecycle_status column + enum

Atomic cleanup migration. Order matters — trigger DROP first (or column
drop fails because the BEFORE trigger reads `lifecycle_status`), then
function, then column, then enum. `pool_view` revised to remove the four
legacy `*_count` columns. `node_drain` re-sync trigger stays.

## Done when

- [ ] `apps/web/supabase/schemas/49-node-state-cleanup.sql` exists with the documented order.
- [ ] Schema 48 stripped of `pool_view` legacy `*_count` columns and any reference to `lifecycle_status` in the function (if removed entirely, function and trigger creation collapse to no-ops).
- [ ] Schema 46 updated if it still references the legacy columns (it does not, by design — verify).
- [ ] `pnpm supabase:web:reset && pnpm supabase:web:typegen` succeeds; `database.types.ts` regenerated; pool_view row no longer has `running_count` / `draining_count` / `stopped_count` / `error_count` / `lifecycle_status`.
- [ ] Local DB check: `\d public.node` no `lifecycle_status`; `\dT public.node_lifecycle_status` reports does not exist.

## Notes

- Production-rollout sentinel: prepend `-- @migration-mode: blue-green` so CI knows this needs the deploy-code-first → migrate ordering. Local-only `/finish` flow merges atomically; production handles in spec §13.
- Legacy `STATUS_DOT` / `STATUS_TILE` / `STATUS_FILL` are not deleted here (they're TS constants, story task 007 owns those).
