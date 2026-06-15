---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#61-schema"
  - "#79-supabase-schema"
status: pending
started: null
finished: null
blocks: []
blocked_by:
  - "001-scaffold-environments-packages"
---

# Add is_source datasources column

## Goal

Add the `is_source boolean not null default false` column to `public.datasources` via a new numbered schema file, extend `DatasourceSchema` in the domain entity to match, regenerate Supabase types, and verify both the persistent shape and the domain entity carry the new field so Story 002's display types pick it up via `.pick(...)` / `.extend(...)` automatically.

## Scope

**In scope**

- New file `apps/web/supabase/schemas/36-datasources-is-source.sql` with a single `alter table public.datasources add column if not exists is_source boolean not null default false;`.
- Run `pnpm --filter web run supabase:db:diff -f datasources-is-source` to emit a migration.
- Run `pnpm supabase:web:reset` to apply the schema cleanly on top of everything that came before.
- Run `pnpm supabase:web:typegen` and commit the updated `packages/supabase/src/database.types.ts` so `Tables<'datasources'>` carries `is_source: boolean`.
- Update `packages/domain/src/entities/datasource.type.ts`:
  - Add `is_source: z.boolean().default(false)` to `DatasourceSchema`.
  - Add `@Expose() public is_source!: boolean;` to `DatasourceEntity` (matching the existing snake_case pass-through convention used for `datasource_provider` / `datasource_driver` / `datasource_kind`).
  - Update `DatasourceEntity.create(...)` to default `is_source: false`.
  - Update `DatasourceEntity.update(...)` to pass through `is_source` when the DTO provides it.
- Confirm `pnpm typecheck` across `packages/domain`, `packages/repositories/supabase`, `apps/server`, `apps/web` — no existing selector / insert path regresses.
- Confirm existing domain tests in `packages/domain` and server route tests in `apps/server` still pass.

**Out of scope** (forces honest slicing)

- Any UI for flipping `is_source` (→ RFC 0004 or later).
- Any new RLS policy (existing `datasources_read` / `datasources_write` / `datasources_update` / `datasources_delete` policies already apply — see spec §8).
- Any new permission in `app_permissions` enum (`datasources.manage` already covers it).
- Backfilling existing rows — `default false` is the intended initial state.
- Updating the HTTP / Supabase adapter to read `is_source` in any query path — phase 1 reads from fixtures, not the DB (→ RFC 0004).

## Acceptance criteria

- [ ] `apps/web/supabase/schemas/36-datasources-is-source.sql` exists with the single `alter table ... add column ...` statement and no policy changes.
- [ ] `pnpm supabase:web:reset` applies the new schema file cleanly.
- [ ] `pnpm supabase:web:typegen` regenerates `packages/supabase/src/database.types.ts` so `Tables<'datasources'>` carries `is_source: boolean`.
- [ ] `DatasourceSchema.parse({ …, is_source: false })` and `DatasourceSchema.parse({ …, is_source: true })` both succeed.
- [ ] `DatasourceSchema.parse({ …no is_source… })` applies the default `false`.
- [ ] `DatasourceEntity.create({…})` produces an entity with `is_source: false` when the input does not specify it.
- [ ] `pnpm typecheck` passes across `packages/domain`, `packages/repositories/supabase`, `apps/server`, `apps/web` without any regression.
- [ ] `pnpm test` passes — existing domain and server tests must not break because of the new field.
- [ ] No hand-edit to `packages/supabase/src/database.types.ts` — the file is only touched by `pnpm supabase:web:typegen`.
- [ ] `packages/features/environments/src/types/source-card.ts` does not need changes — `SourceCardSchema` automatically sees `is_source` via `DatasourceSchema.pick(...)` if it picks that field; if it doesn't pick it in phase 1, that is also fine (Story 002 gets to decide).

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
# Apply the new schema + regen types
pnpm supabase:web:reset
pnpm supabase:web:typegen

# Confirm the generated type carries the column
grep -n is_source packages/supabase/src/database.types.ts

# Confirm the domain entity schema parses both values
pnpm --filter @guepard/domain test

# Full typecheck and test sweep — no regressions allowed
pnpm typecheck
pnpm test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
