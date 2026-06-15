---
story: ./story.md
status: done
layer: db
model: sonnet
files:
  - apps/web/supabase/schemas/48-node-legacy-status-trigger.sql
  - packages/supabase/src/database.types.ts
validation:
  kind: typecheck-only
---

# Add legacy-status sync trigger + rewrite `pool_view`

Schema 48 ships the `sync_legacy_status_from_new_fields()` plpgsql function
(deterministic precedence per RFC §7.2 / spec §6.1b) wired as a
`BEFORE INSERT OR UPDATE` trigger on `public.node`. Same migration rewrites
`pool_view` to expose `lifecycle_*_count` and `health_{healthy,degraded,
critical,unknown}_count` columns. After `pnpm supabase:web:reset && pnpm
supabase:web:typegen`, generated types reflect the new view shape.

## Done when

- [ ] `apps/web/supabase/schemas/48-node-legacy-status-trigger.sql` exists with the function + trigger + `pool_view` `CREATE OR REPLACE`.
- [ ] Trigger precedence matches spec §6.1b table — verified by inserting test rows with each `(lifecycle, orchestration, eligibility, drain.active)` combo and reading back `lifecycle_status`.
- [ ] `pool_view` returns the new aggregate columns (no application code reads them yet).
- [ ] After typegen, `Database['public']['Views']['pool_view']['Row']` includes `lifecycle_*_count` and `health_*_count` keys.
- [ ] `pnpm typecheck` green across affected packages.

## Notes

- SQL FIRST per spec §12.1 — every later task in this story depends on the trigger being live.
- `security_invoker = true` on `pool_view` — RLS continues inheriting from `public.node`.
- Zero application reads of `lifecycle_status` should remain after this story; story 003 drops the column outright.
