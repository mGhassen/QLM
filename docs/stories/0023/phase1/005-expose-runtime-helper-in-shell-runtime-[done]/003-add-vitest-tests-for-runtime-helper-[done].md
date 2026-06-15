---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - packages/shell-runtime/__tests__/runtime.test.tsx
  - packages/shell-runtime/vitest.config.ts
  - packages/shell-runtime/package.json
validation:
  kind: typecheck-only
---

# Add vitest tests for runtime helper

Add unit tests for the `useRuntime()` hook + the 7 Tauri wrappers using `renderHook` and a mocked `@tauri-apps/api/core`.

## Done when

- [ ] `packages/shell-runtime/__tests__/runtime.test.tsx` covers:
  - `useRuntime()` returns `'web'` when `window.__TAURI_INTERNALS__` is absent.
  - `useRuntime()` returns `'desktop'` when `window.__TAURI_INTERNALS__` is present (set + `delete` per test via `beforeEach` / `afterEach`).
  - Each of the 7 wrappers throws `DesktopApiUnavailableError` (matching `instanceof` and `name === 'DesktopApiUnavailableError'`) when called from web runtime.
  - Each wrapper calls `invoke(...)` with the right Tauri command name + args when called from desktop runtime — verified via `vi.mock('@tauri-apps/api/core', ...)` returning a `vi.fn()` and asserting on `mock.calls`.
- [ ] `packages/shell-runtime/vitest.config.ts` exists if not already (jsdom env, istanbul coverage — mirror `packages/features/accounts/vitest.config.ts` or similar).
- [ ] `packages/shell-runtime/package.json` adds vitest + jsdom + `@testing-library/react` devDeps if missing (mirror what `packages/features/accounts` declares).
- [ ] `pnpm --filter @qlm/shell-runtime test` runs and all new tests pass.
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#73-shell-runtime-packagesshell-runtime`.
- Mock `@tauri-apps/api/core` rather than the actual Tauri runtime — the latter requires a Rust webview which isn't available in vitest/jsdom.
