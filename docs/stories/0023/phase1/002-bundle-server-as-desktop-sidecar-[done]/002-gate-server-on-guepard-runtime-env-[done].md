---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/index.ts
  - apps/server/__tests__/desktop-runtime.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/desktop-runtime.test.ts
---

# Gate server on GUEPARD_RUNTIME env

Teach `apps/server/src/index.ts` to detect the `GUEPARD_RUNTIME=desktop` env var and switch to desktop-mode behaviour: bind `127.0.0.1` only (never `0.0.0.0`), resolve `GUEPARD_STORAGE_DIR` (default `~/.guepard/storage/`) and use it for any local SQLite app-state path.

## Done when

- [ ] `apps/server/src/index.ts` reads `process.env.GUEPARD_RUNTIME`. When `=== 'desktop'`:
  - `HOSTNAME` is forced to `127.0.0.1` regardless of any other env value.
  - `process.env.QWERY_STORAGE_DIR` (the existing storage env var) is set from `process.env.GUEPARD_STORAGE_DIR` if present, defaulting to `<os.homedir>/.guepard/storage` when absent.
  - A startup log line records `[Server] runtime=desktop hostname=127.0.0.1 storageDir=<path>` (no secrets).
- [ ] Web/cloud behaviour (no `GUEPARD_RUNTIME` or any other value) is **unchanged** — `HOSTNAME` defaults to `0.0.0.0`, port resolution unchanged.
- [ ] New test `apps/server/__tests__/desktop-runtime.test.ts` covers:
  - `GUEPARD_RUNTIME=desktop` → derived hostname is `127.0.0.1`, derived storage dir is `<homedir>/.guepard/storage` when unset.
  - `GUEPARD_RUNTIME=desktop` + `GUEPARD_STORAGE_DIR=/tmp/foo` → derived storage dir is `/tmp/foo`.
  - `GUEPARD_RUNTIME=desktop` + `HOSTNAME=0.0.0.0` env → derived hostname is still `127.0.0.1` (gate wins).
  - No `GUEPARD_RUNTIME` → existing default hostname `0.0.0.0`.
  - To make this testable, extract a small pure helper (e.g. `resolveDesktopRuntime(env, homedir)`) from `index.ts` and unit-test it directly. `Bun.serve` is not exercised by the test.
- [ ] `pnpm --filter server test apps/server/__tests__/desktop-runtime.test.ts` is green.
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#74-server-appsserver`. Storage env var stays named `QWERY_STORAGE_DIR` internally for now (the existing code uses it widely); `GUEPARD_STORAGE_DIR` is the new desktop-side input mapped onto it.
- Refresh-token rehydration (`GUEPARD_REFRESH_TOKEN`) is **out of scope** — that's story 007.
