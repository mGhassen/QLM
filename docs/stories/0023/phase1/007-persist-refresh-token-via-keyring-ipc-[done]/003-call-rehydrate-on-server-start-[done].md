---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/index.ts
validation:
  kind: typecheck-only
---

# Call rehydrate on server start

Wire `rehydrateSession` (task 001) into the sidecar bootstrap so the rehydrate completes before the Hono server starts accepting requests — per spec §7.4 ("rehydrate session before serving the first request").

## Done when

- [ ] In `apps/server/src/index.ts` (the actual entry that calls `Bun.serve`), gate on `process.env.QLM_RUNTIME === 'desktop'` and `await rehydrateSession({ env: process.env, refresh, keyring: keyringClient })` before the listen call.
- [ ] `refresh` is a thin async wrapper around the existing Supabase server client (`@qlm/supabase/server-client`) that calls `auth.refreshSession({ refresh_token })` and normalises the response to the `RehydrateResult` shape consumed by task 001.
- [ ] On `status: 'rehydrated'` log a single line `desktop:boot rehydrate=ok`. On `'expired'` log `desktop:boot rehydrate=expired`. On `'failed'` log `desktop:boot rehydrate=failed reason=<reason>`. Never log the token. Use the existing `getLogger('server')` from `@qlm/shared/logger`.
- [ ] `pnpm typecheck` green. Existing `apps/server/__tests__/desktop-runtime.test.ts` still green.

## Notes

- Logic and edge cases are tested in 001's vitest — this task is wiring + a typecheck-only gate.
- Spec anchor: `#74-server-appsserver` ("Runtime detection" — rehydrate before serving the first request).
