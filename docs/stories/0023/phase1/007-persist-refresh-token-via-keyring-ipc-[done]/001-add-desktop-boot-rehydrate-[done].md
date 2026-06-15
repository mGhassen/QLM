---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/runtime/desktop-boot.ts
  - apps/server/__tests__/runtime/desktop-boot.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/runtime/desktop-boot.test.ts
---

# Add desktop boot rehydrate

Add `apps/server/src/runtime/desktop-boot.ts` exposing a `rehydrateSession` use case that reads `GUEPARD_REFRESH_TOKEN` at boot, exchanges it with Supabase, and persists the new refresh token via `keyringClient` — so a relaunched desktop app skips the sign-in screen.

## Done when

- [ ] `apps/server/src/runtime/desktop-boot.ts` exports `rehydrateSession({ env, refresh, keyring }): Promise<RehydrateResult>` where:
  - `env: NodeJS.ProcessEnv` — reads `GUEPARD_REFRESH_TOKEN` and `GUEPARD_SERVER_URL`. Returns `{ status: 'skipped' }` when either is missing.
  - `refresh: (token: string) => Promise<{ refresh_token: string; access_token: string } | { code: 'expired' | 'unauthorized' | 'transient'; message: string }>` — Supabase-shaped client, injected for testability.
  - `keyring: KeyringClient` — same shape as `apps/server/src/lib/keyring-client.ts`. The boot helper persists `refresh_token:${GUEPARD_SERVER_URL}` on success and deletes it on terminal failure.
- [ ] Retry budget per spec §5.3: 3 attempts on `transient` failures with exponential backoff (`100ms → 400ms → 1600ms`). Caller injects `sleep(ms): Promise<void>` (default real, replaceable in tests).
- [ ] Single in-flight refresh: a module-level `inFlight: Promise<RehydrateResult> | null` is cleared on settle so concurrent callers share one upstream request.
- [ ] Returns a discriminated union: `{ status: 'rehydrated' | 'skipped' | 'expired' | 'failed', reason?: string }` — never throws.
- [ ] `apps/server/__tests__/runtime/desktop-boot.test.ts` covers:
  - happy path → status `rehydrated`, keyring `set` called with the new token.
  - missing env → status `skipped`, no calls to refresh / keyring.
  - expired token → status `expired`, keyring `delete` called, `refresh` called once.
  - 3 transient retries before success → status `rehydrated`.
  - 3 transient retries then terminal → status `failed`, keyring `delete` NOT called (next launch retries).
  - concurrent callers share a single `refresh` invocation.

## Notes

- Closure-injected dependencies keep the helper unit-testable without `vi.mock`.
- Spec anchor: `#74-server-appsserver` ("Runtime detection" + "Keyring-IPC client" bullets).
- Spec anchor: `#33-user-flows-happy-paths` ("App restart with existing session" steps 1–4).
