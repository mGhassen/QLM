---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#61-schema"
  - "#78-database-appswebsupabaseschemas"
started: 2026-04-18
finished: 2026-04-18
status: done
blocks:
  - "004-add-user-preferences-domain"
  - "005-implement-user-preferences-api"
blocked_by: []
---

# Add user_preferences table

## Goal

Create the `user_preferences` table with RLS and timestamp trigger so the domain and server layers have a real persistence target.

## Scope

**In scope**
- New SQL file `apps/web/supabase/schemas/NN-user-preferences.sql` (NN = next free number) containing:
  - `user_preferences(user_id uuid PK, preferences jsonb default '{}'::jsonb not null, created_at timestamptz, updated_at timestamptz)`.
  - `ENABLE ROW LEVEL SECURITY`.
  - Four policies for `SELECT` / `INSERT` / `UPDATE` / `DELETE`, each bound to `user_id = (select auth.uid())`.
  - `trigger_set_timestamps()` attached.
  - `revoke all` + `grant select, insert, update, delete` to `authenticated`.
- Regenerate DB types via `pnpm supabase:web:reset && pnpm supabase:web:typegen`.
- Commit the refreshed `packages/supabase/src/database.types.ts`.

**Out of scope**
- Any application-side code referencing the table (stories 004, 005).
- Audit logging of preference changes (not required for phase 1).

## Acceptance criteria

- [x] `pnpm supabase:web:reset` applies the new `20260418205650_user-preferences` migration cleanly.
- [x] `pnpm supabase:web:typegen` regenerates `packages/supabase/src/database.types.ts` with `Tables<'user_preferences'>` present (the secondary `supabase:typegen:app` script fails on an unrelated pre-existing dead path `apps/web/lib/database.types.ts`).
- [x] `pnpm typecheck` green (49/49 tasks) after regen.
- [x] Declarative RLS policies shipped — `user_preferences_read/insert/update/delete` all bound to `user_id = (select auth.uid())`; INSERT/UPDATE carry WITH CHECK. Runtime cross-user deny behaviour is deferred to story 010's e2e suite (see Deferred verification below).

### Deferred verification (picked up by story 010)

- Cross-user `SELECT` on `user_preferences` from `authenticated` role must fail.
- `INSERT` with a `user_id` mismatch must fail (RLS WITH CHECK).
- These require two authenticated users against the live local Supabase + a Playwright driver; the declarative policies mirror the proven sibling pattern from `apps/web/supabase/schemas/22-datasources.sql`.

## Tasks

1. [001-add-user-preferences-schema](001-add-user-preferences-schema-[done].md)

## Demo / verification

```
pnpm supabase:web:reset
pnpm supabase:web:typegen
pnpm typecheck
```

Then in the Supabase SQL editor (or `psql`): verify policies are listed for `user_preferences` and sign-in as two different users to confirm cross-user reads are blocked.

## Questions surfaced

## Notes

- Migration was auto-generated via `supabase db diff -f user-preferences`, then trimmed manually to drop unrelated platform-table constraint churn and restore the schema's explicit `revoke` + `grant to authenticated` intent (supabase defaults grant everything to `anon`).
- `supabase:typegen:app` script writes to `apps/web/lib/database.types.ts`, a path that doesn't exist in the current tree — pre-existing dead route, flagged but out of story scope.
- Runtime RLS verification (cross-user SELECT/INSERT deny) deferred to story 010's e2e suite; the declarative policies mirror the sibling pattern from `22-datasources.sql`.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
