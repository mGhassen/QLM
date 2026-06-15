---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/routes/auth.ts
  - apps/server/src/server.ts
  - apps/server/__tests__/auth.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/auth.test.ts
---

# Add sidecar auth routes

Expose `POST /auth/sign-in` and `POST /auth/sign-out` on `apps/server` so the desktop sidecar persists the refresh token via keyring-IPC after Supabase auth, rather than leaving the SPA to write it to local storage.

## Done when

- [ ] `apps/server/src/routes/auth.ts` exports `createAuthRoutes({ supabase, keyring }): Hono` with:
  - `POST /auth/sign-in` — Zod-validated `{ email: string; password: string }`. On success calls `keyring.set('refresh_token:${GUEPARD_SERVER_URL}', refresh_token)` (no-op when `keyring.isAvailable()` is `false`, i.e. server not under the desktop shell), sets the Supabase session cookie on the response, returns `200 { redirectTo: '/' }`. On failure returns `401 { error: 'invalid_credentials' }` — message is generic regardless of cause.
  - `POST /auth/sign-out` — cookie-authed (existing middleware). Calls Supabase `signOut`, then `keyring.delete('refresh_token:${GUEPARD_SERVER_URL}')` (swallowed when not under desktop). Returns `204`.
- [ ] Wired into `apps/server/src/server.ts`'s route registry.
- [ ] Errors carry no token / no value — only the failure code. Logger redacts `password` and `refresh_token` (project-wide Pino redact list already covers these per `.claude/rules/security.md`).
- [ ] `apps/server/__tests__/auth.test.ts` covers:
  - sign-in happy path → 200, cookie set, `keyring.set` called with the right key + value.
  - sign-in invalid creds → 401, `keyring.set` NOT called.
  - sign-in when keyring unavailable → 200 (no keyring calls, no error).
  - sign-out happy path → 204, `keyring.delete` called.
  - sign-out when keyring unavailable → 204.
  - sign-in when keyring write fails → still 200 (auth succeeded; keyring failure is best-effort, logged + dropped).

## Notes

- Tests stub Supabase + keyringClient via factory params — no `vi.mock`.
- Spec anchor: `#52-endpoints` (Sidecar (Bun) `POST /auth/sign-in` + `POST /auth/sign-out` rows).
- Spec anchor: `#33-user-flows-happy-paths` (sign-in step 5, sign-out steps 1–3).
