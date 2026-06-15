---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#52-endpoints"
  - "#72-adapters"
  - "#74-server-appsserver"
started: 2026-04-18
finished: 2026-04-19
blocks:
  - "006-wire-user-preferences-runtime"
blocked_by:
  - "003-add-user-preferences-table"
  - "004-add-user-preferences-domain"
---

# Implement user_preferences API

## Goal

Ship the Supabase adapter plus the two Hono routes (`GET` / `PATCH /api/me/preferences`) so the domain port is persistence-backed and reachable over HTTP.

## Scope

**In scope**
- `packages/repositories/supabase/src/user-preferences.repository.ts` — implements `IUserPreferencesRepository` using the Supabase client.
- `apps/server/src/routes/user-preferences.ts` — Hono router with:
  - `GET /api/me/preferences` → returns `{ preferences, updatedAt }`; returns empty `{}` preferences when no row exists (no 404).
  - `PATCH /api/me/preferences` → validates body with `UserPreferencesSchema.partial().passthrough()`, merges atomically server-side (`preferences || $1::jsonb`), returns the resulting row.
- Mount the router under the authed group in `apps/server/src/index.ts`.
- Rate limit `PATCH` at 60 rpm per user (reuse existing middleware).
- Route unit tests via `app.request(...)` covering: empty GET, PATCH merge preserves sibling keys, malformed PATCH → 400, wrong-auth → 401.

**Out of scope**
- HTTP adapter for the browser (story 006).
- Any UI wiring.

## Acceptance criteria

- [x] `pnpm --filter server test __tests__/routes/user-preferences.test.ts` passes (happy + malformed + unauthenticated branches).
- [x] `pnpm --filter @qlm/repository-supabase test` passes for the new adapter.
- [x] `GET /api/me/preferences` with no row returns `200` and `{ preferences: {} }`.
- [x] `PATCH` with `{ last_project_by_org: { [orgId]: projectId } }` merges without destroying other future keys.
- [x] RLS still enforced when the adapter runs under the user's auth context.

## Tasks

1. [001-implement-user-preferences-adapters](./001-implement-user-preferences-adapters-[done].md) — Supabase + HTTP adapters, `merge_user_preferences` RPC, factory + Repositories type wiring.
2. [002-implement-server-routes](./002-implement-server-routes-[done].md) — `GET` / `PATCH /api/me/preferences` with Zod validation, atomic merge, 60 rpm per-user rate limit, route tests.

## Demo / verification

```
pnpm --filter server test __tests__/routes/user-preferences.test.ts
pnpm --filter @qlm/repository-supabase test
pnpm server:dev    # then hit GET/PATCH /api/me/preferences with curl
```

Example:

```
curl -X PATCH http://localhost:4096/api/me/preferences \
  -H 'content-type: application/json' \
  -d '{"last_project_by_org":{"org-uuid":"proj-uuid"}}'
```

## Notes

- 001 added `public.merge_user_preferences(jsonb)` RPC — Supabase JS `.upsert()` replaces JSONB columns rather than merging, so the atomic `||` merge had to live server-side. Migration diff also emitted a spurious `grant … to "anon"` on `user_preferences` which was stripped.
- 002 surfaced that `jsonb ||` is shallow: top-level sibling keys are preserved, but nested maps (like `last_project_by_org`) are replaced wholesale. The story-006 runtime `setLastProject(orgId, projectId)` will need to read-then-merge in memory before PATCH.

## Questions surfaced

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
