---
spec: docs/specs/0026-node-state-decomposition-phase1.md
spec_sections:
  - "#65-deletions-end-of-phase-2"
status: done
started: 2026-04-28
finished: 2026-04-28
blocks: []
blocked_by: ["004-drop-status-presentation"]
---

# Drop deprecated Node.status — DB schema 49 + pressure aliases + i18n

## Goal

Final cleanup that closes RFC 0026 §6.5. Drop the legacy `lifecycle_status` column + enum + sync trigger from the DB. Drop the legacy `PressurePointKind` aliases (`high-cpu`, `high-mem`, `down`). Drop `nodes.status.*` and `topology.pressure.kind.down` i18n keys.

## Scope

**In scope**

- `apps/web/supabase/schemas/49-node-state-cleanup.sql` — atomic migration:
  1. drop trigger `sync_legacy_status_from_new_fields_trg`
  2. drop function `public.sync_legacy_status_from_new_fields()`
  3. drop column `public.node.lifecycle_status`
  4. drop type `public.node_lifecycle_status`
- Run `pnpm supabase:web:reset && pnpm supabase:web:typegen`.
- Update `pool_view` definition if it still projects `status_counts`.
- Drop `PressurePointKind` legacy aliases (`high-cpu`, `high-mem`, `down`) from the domain entity. New names already ship: `unreachable`, `failing`, `criticalHealth`, `highCpu`, `highMem`.
- Drop `nodes.status.*` keys + `topology.pressure.kind.down` from `packages/i18n/src/locales/*.json`.
- Final repo-wide grep sweep.

**Out of scope**

- Any new functionality.
- ESLint rule `no-orchestration-write` upgrade — already enforced after story 002 for new code.

## Acceptance criteria

- [ ] `pnpm supabase:web:reset && pnpm supabase:web:typegen` green.
- [ ] `psql "$LOCAL_SUPABASE_URL" -c "\d public.node"` shows no `lifecycle_status` column.
- [ ] `psql "$LOCAL_SUPABASE_URL" -c "\dT public.node_lifecycle_status"` returns "does not exist".
- [ ] `grep -rn 'node\.status\b\|NodeStatus\b\|changeStatus\b\|STATUS_TO_SQL\|statusCounts\b\|"high-cpu"\|"high-mem"\|"down"' packages apps tooling | grep -v node_modules | grep -v .turbo` returns zero (or only references inside this story file).
- [ ] `pnpm typecheck && pnpm test && pnpm build` green.
- [ ] `pnpm --filter web e2e` green (existing flows + drain spec).
- [ ] `hex-architecture-reviewer` agent passes.

## Tasks

(scaffolded by `/start-story`. Expected ~3 tasks: DB migration, pressure-kind cleanup, i18n cleanup. `model: sonnet` for DB; `model: haiku` for i18n.)

## Demo / verification

```bash
pnpm supabase:web:reset && pnpm supabase:web:typegen
pnpm typecheck && pnpm test && pnpm build
pnpm --filter web e2e
grep -rn 'node\.status\b\|NodeStatus\b\|changeStatus\b\|STATUS_TO_SQL\|statusCounts\b' \
  packages apps tooling | grep -v node_modules | grep -v .turbo
# expect: zero
```
