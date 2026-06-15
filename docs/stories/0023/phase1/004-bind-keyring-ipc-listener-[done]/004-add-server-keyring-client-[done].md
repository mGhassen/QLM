---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/lib/keyring-client.ts
  - apps/server/__tests__/lib/keyring-client.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/lib/keyring-client.test.ts
---

# Add server keyring client

Add a thin `keyringClient` module to `apps/server` that reads `GUEPARD_KEYRING_PORT` + `GUEPARD_KEYRING_TOKEN` from `process.env` and exposes `set` / `get` / `delete` against the Tauri shell IPC. Sidecar consumers (story 007) wire it to the auth flow.

## Done when

- [ ] `apps/server/src/lib/keyring-client.ts` exports:
  - `keyringClient.set(key: string, value: string): Promise<void>` — `POST /keyring/set`.
  - `keyringClient.get(key: string): Promise<string | null>` — `GET /keyring/get?key=...`; `null` on `404`.
  - `keyringClient.delete(key: string): Promise<void>` — `DELETE /keyring/{key}`; `404` is a successful no-op.
  - `keyringClient.isAvailable(): boolean` — `true` only when both env vars are set (sidecar may run outside Tauri in CI).
- [ ] All requests include `Authorization: Bearer <token>` and a fresh `Date` header.
- [ ] Non-2xx + non-404 responses throw an `Error` whose message is `keyring-ipc: <verb> <key> failed (status=<n>)` — never include the token or value.
- [ ] `apps/server/__tests__/lib/keyring-client.test.ts` covers:
  - happy paths for set/get/delete (mocked `globalThis.fetch`).
  - `get` returning `null` on a 404.
  - `delete` swallowing a 404.
  - `isAvailable()` returning `false` when either env var is missing.
  - request shape (Authorization + Date headers present, URL uses 127.0.0.1 and the right port).
- [ ] `pnpm --filter server test -- __tests__/lib/keyring-client.test.ts` green.

## Notes

- This module is only used by sidecar consumers — it is never imported by route handlers directly. Keep it framework-agnostic (no Hono context).
- Spec anchor: `#74-server-appsserver` (keyring-IPC client bullet).
