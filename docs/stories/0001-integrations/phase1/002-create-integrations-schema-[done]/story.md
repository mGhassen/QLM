---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#6-data-model"
  - "#8-permissions-and-rls-summary"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-model-integration-domain
---

# Create integrations schema

## Goal

Land the `integration_connections` table with full Row Level Security, register the new `integrations.manage` app permission, and seed it on the owner and administrator roles so every later layer can read and write through RLS.

## Scope

**In scope**
- New numbered schema file for `integration_connections` with columns, indexes, triggers
- `ALTER TYPE app_permissions ADD VALUE 'integrations.manage'` in a separate migration (enum mutation must run in its own transaction)
- Seed the new permission on `owner` and `administrator` roles
- Explicit RLS policies: SELECT / INSERT / UPDATE / DELETE (no `FOR ALL`)
- Regenerated `database.types.ts`

**Out of scope**
- Repository adapter on top of the schema → story 004
- Server routes → story 005

## Acceptance criteria

- [x] `pnpm supabase:web:reset` rebuilds the local DB cleanly from schemas
- [x] `pnpm supabase:web:typegen` regenerates `database.types.ts` without manual edits
- [x] RLS is `enabled` on `public.integration_connections` with four named policies
- [x] `integrations.manage` resolves on owner + administrator roles via `has_permission(...)`
- [x] Unique index on `(project_id, slug)` prevents duplicates within a project

## Tasks

Shipped files:

- `apps/web/supabase/schemas/35-integration-connections.sql` — canonical table, indexes, `updated_at` trigger, four RLS policies using `has_role_on_organization` + `has_permission`
- `apps/web/supabase/schemas/01-enums.sql` — added `'integrations.manage'` to `public.app_permissions`
- `apps/web/supabase/schemas/20-roles-seed.sql` — seeded `integrations.manage` on owner + administrator
- `apps/web/supabase/migrations/20260411174740_add-integrations-manage-permission.sql` — enum mutation in its own transaction
- `apps/web/supabase/migrations/20260411174741_integration-connections.sql` — table + RLS + idempotent permission seed
- `apps/web/src/lib/database.types.ts` — regenerated via `supabase:web:typegen`

## Demo / verification

```bash
pnpm supabase:web:reset
pnpm supabase:web:typegen
pnpm --filter web typecheck
```

`integration_connections` shows up in `Tables<'integration_connections'>`. Inserting a row as a non-owner is rejected by RLS.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
