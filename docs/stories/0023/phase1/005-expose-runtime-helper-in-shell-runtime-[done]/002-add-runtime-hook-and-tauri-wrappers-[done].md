---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - packages/shell-runtime/src/runtime.ts
  - packages/shell-runtime/src/index.ts
  - packages/shell-runtime/package.json
validation:
  kind: typecheck-only
---

# Add useRuntime hook and Tauri wrappers

Add a `useRuntime()` React hook + 7 thin `@tauri-apps/api invoke(...)` wrappers in `packages/shell-runtime` so `apps/web` can gate desktop-only UI without poking `window.__TAURI__` directly.

## Done when

- [ ] `packages/shell-runtime/src/runtime.ts` exports:
  - `useRuntime(): 'web' | 'desktop'` — reads `isDesktopApp()` from `@guepard/shared/desktop`. Stable per render via `useMemo`. Reactive: a host that toggles `__TAURI_INTERNALS__` mid-session is not supported, but the existing `platform` constant already picks at module load.
  - `saveProviderKey(key, value): Promise<void>`
  - `getProviderKey(key): Promise<string | null>`
  - `deleteProviderKey(key): Promise<void>`
  - `debugKeyringStatus(): Promise<Record<string, string>>`
  - `getAppConfig(): Promise<Record<string, string>>`
  - `setAppConfig(config): Promise<void>`
  - `restartSidecar(): Promise<void>`
- [ ] Each wrapper guards on `isDesktopApp() === false` and throws the typed `DesktopApiUnavailableError` (from `@guepard/shared/desktop`, added in task 001).
- [ ] Each wrapper calls `invoke(...)` from `@tauri-apps/api/core` and maps the Tauri command names: `saveProviderKey → save_api_key`, `getProviderKey → get_api_key`, `deleteProviderKey → delete_api_key`, `debugKeyringStatus → debug_keyring_status`, `getAppConfig → get_app_config`, `setAppConfig → set_app_config`, `restartSidecar → restart_sidecar`.
- [ ] `packages/shell-runtime/src/index.ts` re-exports `useRuntime`, the 7 wrappers, and the `DesktopApiUnavailableError`.
- [ ] `packages/shell-runtime/package.json` adds `@tauri-apps/api` to `dependencies` (`^2`). `pnpm install` resolves cleanly.
- [ ] `pnpm typecheck` stays green across the monorepo.

## Notes

- Spec anchor: `#73-shell-runtime-packagesshell-runtime`.
- `restart_sidecar` Tauri command lands in story 009; the wrapper exists now so consumers can be written against it. Calling it before story 009 ships will throw a Tauri-side "command not found" — that's fine, it's a no-op pre-009.
- Don't add @tauri-apps/api as a peer dep — it's a runtime requirement when `useRuntime() === 'desktop'`. Listing it as a regular dep keeps things simple; web bundles will tree-shake the unreferenced parts.
