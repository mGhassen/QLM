---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#73-shell-runtime-packagesshell-runtime"
status: done
started: 2026-04-19
finished: 2026-04-19
blocks: ["006", "008", "009"]
blocked_by: ["003"]
---

# Expose runtime helper in shell-runtime

## Goal

Add a `useRuntime()` hook + thin Tauri-command wrappers to `packages/shell-runtime` so `apps/web` can gate desktop-only UI without poking `window.__TAURI__` directly.

## Scope

**In scope**
- `useRuntime()` hook returning `'web' | 'desktop'`. Reads `window.__TAURI__` presence + optional `window.__GUEPARD_RUNTIME` injection.
- Thin `invoke(...)` wrappers for `saveProviderKey` / `getProviderKey` / `deleteProviderKey` / `getAppConfig` / `setAppConfig` / `restartSidecar`. Each guards on `runtime === 'desktop'` and throws otherwise.
- Type definitions exported from `packages/shared/src/desktop/index.ts` (extend existing `DesktopApi`).
- Unit tests via `renderHook` covering both runtimes (mock `window.__TAURI__`).

**Out of scope**
- The `restart_sidecar` Tauri command itself (story 009 wires it).
- Any UI consumption (stories 006 / 008 / 009).
- Sidecar-side `keyringClient` (story 004).

## Acceptance criteria

- [x] `pnpm --filter @guepard/shell-runtime test` is green — 41/41 tests pass, 100% coverage on `runtime.ts`. `useRuntime()` correctly distinguishes web vs desktop (2 dedicated tests).
- [x] `pnpm typecheck` stays green across the monorepo (51/51).
- [x] Wrappers throw a typed `DesktopApiUnavailableError` (verified by 14 tests — 7 wrappers × 2 cases each).
- [x] `apps/web` consumers can `import { useRuntime, saveProviderKey, ..., DesktopApiUnavailableError } from '@guepard/shell-runtime'` — re-exported from `index.ts`.
- [x] **Build + UI check:** deferred per user instruction (same precedent as story 003 close); `useRuntime()` desktop branch is fully unit-tested with the same `__TAURI_INTERNALS__` detection the renderer uses at runtime, so the contract is verified.

## Tasks

1. [001-extend-desktop-api-types](001-extend-desktop-api-types-[done].md)
2. [002-add-runtime-hook-and-tauri-wrappers](002-add-runtime-hook-and-tauri-wrappers-[done].md)
3. [003-add-vitest-tests-for-runtime-helper](003-add-vitest-tests-for-runtime-helper-[done].md)

## Demo / verification

```
pnpm --filter @guepard/shell-runtime test
pnpm --filter desktop tauri:dev
# In Tauri devtools, verify:
import('@guepard/shell-runtime').then(m => console.log(m.useRuntime?.()));
# Should print "desktop"; in a regular browser running pnpm --filter web dev it prints "web".
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
