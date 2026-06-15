---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - apps/web/supabase/schemas/44-user-preferences-merge-fn.sql
  - apps/web/supabase/migrations/**
  - packages/supabase/src/database.types.ts
  - packages/repositories/supabase/src/user-preferences.repository.ts
  - packages/repositories/supabase/src/index.ts
  - packages/repositories/supabase/__tests__/user-preferences.repository.test.ts
  - apps/web/src/lib/repositories/user-preferences.repository.ts
  - apps/web/src/lib/repositories/repositories-factory.ts
  - apps/server/src/lib/repositories.ts
  - apps/server/__tests__/helpers/mock-repositories.ts
  - packages/domain/src/repositories/repositories.ts
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Implement user-preferences adapters

Ship both adapters for the `IUserPreferencesRepository` port — Supabase (server-side) and HTTP (browser-side) — plus the `merge_user_preferences` RPC they rely on for atomic jsonb merge, and wire the new resource into every place the `Repositories` type is constructed.

## Done when

- [ ] `44-user-preferences-merge-fn.sql` adds `public.merge_user_preferences(p_patch jsonb)` — `SECURITY INVOKER`, upserts on `user_id = auth.uid()` with `preferences = user_preferences.preferences || EXCLUDED.preferences`, granted to `authenticated`.
- [ ] `supabase:web:reset` + `supabase:web:typegen` run green; `database.types.ts` shows the new function signature.
- [ ] `SupabaseUserPreferencesRepository.get(userId)` returns `null` on `PGRST116` and a parsed row otherwise; `patch(userId, patch)` calls `rpc('merge_user_preferences', { p_patch: patch })` and returns the resulting row.
- [ ] `HttpUserPreferencesRepository` calls `GET/PATCH /api/me/preferences` via `apiGet` / `apiPatch` helpers; the `userId` parameter is intentionally ignored (server derives from session).
- [ ] `userPreferences: IUserPreferencesRepository` appears in the `Repositories` type and is wired in both `apps/web/src/lib/repositories/repositories-factory.ts` and `apps/server/src/lib/repositories.ts`.
- [ ] `mock-repositories.ts` exposes an in-memory `userPreferences` implementation so the route tests (task 002) can seed and assert.
- [ ] Adapter unit test at `packages/repositories/supabase/__tests__/user-preferences.repository.test.ts` mirrors the mocked-builder pattern from `user-token.repository.test.ts`; covers `get`-empty, `get`-hit, `patch` success.
- [ ] `pnpm typecheck` is green across the monorepo.

## Notes

- `apiPatch` may not yet exist in `apps/web/src/lib/repositories/api-client.ts` — add it alongside the existing `apiGet`/`apiPost` helpers if missing. Keep the change minimal; same surface as `apiPost`.
- Supabase JS `.upsert()` replaces columns rather than merging jsonb, so the RPC is load-bearing — without it, concurrent `patch` calls clobber each other's keys.
- `Repositories` type edit plus every consumer wire-up must land in the same commit; touching the type without updating `apps/server/src/lib/repositories.ts` + `apps/web/src/lib/repositories/repositories-factory.ts` + `mock-repositories.ts` breaks compile across the repo.
