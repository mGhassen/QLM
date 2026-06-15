---
story: ./story.md
status: done
layer: db
model: sonnet
files:
  - apps/web/supabase/schemas/43-user-preferences.sql
  - apps/web/supabase/migrations/20260418205650_user-preferences.sql
  - packages/supabase/src/database.types.ts
validation:
  kind: typecheck-only
---

# Add user_preferences schema + RLS + trigger

Ship `public.user_preferences` with four explicit RLS policies, timestamp trigger, and regenerated Supabase types so stories 004 (domain) and 005 (adapter + server) have a real persistence target.

## Done when

- [x] `apps/web/supabase/schemas/43-user-preferences.sql` exists with `user_preferences(user_id uuid PK, preferences jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz)`.
- [x] `user_id` is `references auth.users(id) on delete cascade`.
- [x] `alter table enable row level security` + `revoke all` + `grant select, insert, update, delete to authenticated`.
- [x] Four policies: `user_preferences_read` / `_insert` / `_update` / `_delete`, each bound to `user_id = (select auth.uid())` (INSERT/UPDATE include WITH CHECK).
- [x] Trigger `user_preferences_set_timestamps` wired to `public.trigger_set_timestamps()`.
- [x] `pnpm supabase:web:reset` applies the new migration; `packages/supabase/src/database.types.ts` now contains `Tables<'user_preferences'>`.
- [x] Monorepo-wide `pnpm typecheck` stays green (49/49).

## Notes

- Mirror the `grant` + `revoke` + policy shape from `22-datasources.sql` and `35-integration-connections.sql` — both use the same `user_id = (select auth.uid())` pattern.
- Runtime cross-user RLS verification requires a running local Supabase + two auth'd users — covered in the story-level manual smoke section.
- JSONB default `'{}'::jsonb` lets the first `GET` on an uninitialised user return an empty preferences object without server-side upsert gymnastics.
