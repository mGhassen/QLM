---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/shared/src/desktop/index.ts
validation:
  kind: typecheck-only
---

# Extend DesktopApi types

Extend the existing `DesktopApi` interface in `packages/shared/src/desktop/index.ts` with the 7 new Tauri-backed methods that story 005's wrappers will expose.

## Done when

- [ ] `packages/shared/src/desktop/index.ts` adds (alongside the existing electron-shape methods):
  - `saveProviderKey(key: string, value: string): Promise<void>`
  - `getProviderKey(key: string): Promise<string | null>`
  - `deleteProviderKey(key: string): Promise<void>`
  - `debugKeyringStatus(): Promise<Record<string, string>>`
  - `getAppConfig(): Promise<Record<string, string>>`
  - `setAppConfig(config: Record<string, string>): Promise<void>`
  - `restartSidecar(): Promise<void>`
- [ ] A new exported error class `DesktopApiUnavailableError extends Error` (with `name = 'DesktopApiUnavailableError'`) for the wrappers in story 005's task 002 to throw.
- [ ] No semantic change to existing `getDesktopApi`, `isDesktopApp`, `platform`, `isDesktop`, `isWeb`, `Platform` exports — purely additive.
- [ ] `pnpm typecheck` stays green across the monorepo.

## Notes

- Spec anchor: `#73-shell-runtime-packagesshell-runtime`.
- The existing `DesktopApi` was shaped for the Electron scaffold (window controls + file dialogs). The new methods are Tauri-backed; the shared interface unifies both worlds so `apps/web` consumers can talk to one type regardless of host. The wrappers in task 002 implement the new methods via `@tauri-apps/api/core invoke(...)`.
