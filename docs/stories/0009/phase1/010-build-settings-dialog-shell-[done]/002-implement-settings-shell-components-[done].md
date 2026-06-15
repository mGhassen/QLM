---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/settings-shell/src/types/settings-section.ts
  - packages/features/settings-shell/src/components/settings-sidebar.tsx
  - packages/features/settings-shell/src/components/settings-sidebar.stories.tsx
  - packages/features/settings-shell/src/components/settings-dialog.tsx
  - packages/features/settings-shell/src/components/settings-dialog.stories.tsx
  - packages/features/settings-shell/src/components/dirty-state-context.tsx
  - packages/features/settings-shell/src/components/story-helpers.tsx
  - packages/features/settings-shell/__tests__/settings-sidebar.test.tsx
  - packages/features/settings-shell/__tests__/settings-dialog.test.tsx
---

# Implement settings-shell components

## Purpose

`SettingsDialog` (Radix Dialog two-pane shell with discard-guard) + `SettingsSidebar` (vertical nav list) + `DirtyStateProvider` context (per-section opt-in for the discard guard). Single phase-1 consumer is `<SettingsDialogMount>` in apps/web (task 003).

## Files

- `packages/features/settings-shell/src/types/settings-section.ts`:
  - `SettingsSectionKey = string` (a branded type would be overkill — string keys keyed off the section's React-side ID is the simplest contract).
  - `SettingsSection = { key: SettingsSectionKey; label: string; icon?: ReactNode; content: ReactNode }`. Note `label` is the resolved string (caller's responsibility — keeps the shell i18n-agnostic).
- `packages/features/settings-shell/src/components/dirty-state-context.tsx`:
  - `DirtyStateProvider` exposes `setDirty(key: SettingsSectionKey, isDirty: boolean)` + `isDirty(): boolean` (any section dirty).
  - `useSettingsDirtyState()` hook returns the API.
  - `SettingsDialog` consumes this internally to gate close.
- `packages/features/settings-shell/src/components/settings-sidebar.tsx`:
  - Props: `{ sections: SettingsSection[]; activeKey: SettingsSectionKey; onSelect: (key: SettingsSectionKey) => void }`. `Readonly<Props>`.
  - Renders a `<nav>` with `<ul>` of `<li>` entries — each is a `@guepard/ui/button` with `variant="ghost"` and a left-icon slot. Active entry uses `bg-accent text-accent-foreground`.
  - No internal state — fully controlled by parent.
- `packages/features/settings-shell/src/components/settings-dialog.tsx`:
  - Props: `{ open: boolean; onOpenChange: (next: boolean) => void; sections: SettingsSection[]; defaultSectionKey?: SettingsSectionKey; titleKey?: string; closeAriaLabelKey?: string; discardGuardKey?: string }`. `Readonly<Props>`.
  - Internal state: `activeKey` (defaults to `defaultSectionKey ?? sections[0].key`).
  - Layout: `@guepard/ui/dialog` Root → DialogContent (two-column flex: left 240px sidebar, right outlet).
  - Title slot uses `titleKey` (default `'settings:dialog.title'`) via `t(...)`.
  - Close button (X) at top-right uses `closeAriaLabelKey` (default `'settings:dialog.close'`).
  - `onOpenChange(false)` (X / Esc / overlay click) consults `useSettingsDirtyState().isDirty()` — if true, fires a synchronous `confirm(t(discardGuardKey))` (default `'settings:dialog.discardGuard'`); only proceeds when the user confirms. Synchronous `confirm()` keeps the implementation tiny and matches what spec §3.2.1 calls out as acceptable.
- `packages/features/settings-shell/src/components/story-helpers.tsx` — i18n init for `settings.*` namespace + `withSettingsShellProviders` decorator. Mirrors the user-tokens version.
- `settings-sidebar.stories.tsx`: `Empty`, `OneItem`, `ThreeItems`, `WithIcons`.
- `settings-dialog.stories.tsx`: `OneSection`, `ThreeSections`, `DiscardGuardClean` (close fires immediately), `DiscardGuardDirty` (close prompts confirm).
- Tests: sidebar (renders entries, active class, onSelect callback) + dialog (renders title from i18n, X closes, dirty state blocks close until confirm — mock `window.confirm`).

## Acceptance

- [ ] `pnpm --filter @guepard/settings-shell typecheck` passes.
- [ ] `pnpm --filter @guepard/settings-shell test` passes (≥ 80 % coverage on the new files).
- [ ] No hardcoded English strings in dialog/sidebar source files.
- [ ] All components are `Readonly<Props>`.
- [ ] Dirty-state guard only triggers `confirm()` when at least one section is dirty.

## Test plan

```
pnpm --filter @guepard/settings-shell typecheck
pnpm --filter @guepard/settings-shell test
```

## Storybook validation

- **Command**: `pnpm --filter @guepard/storybook-config storybook`
- **Story titles to inspect**: `SettingsShell / SettingsSidebar / Empty | One Item | Three Items | With Icons`, `SettingsShell / SettingsDialog / One Section | Three Sections | Discard Guard Clean | Discard Guard Dirty`.
- **Expected visual outcome**: dialog opens in a centered modal; left rail shows sections; clicking a sidebar entry switches the right outlet content; clicking X / Escape closes immediately when clean and shows a browser-native confirm("Discard unsaved changes?") when dirty.

## Notes

- `confirm()` is the deliberately-simple discard guard — a custom modal-on-modal would be a footgun (per AM-1 "no nested dialogs"). The browser-native one is good enough for phase 1.
- `DirtyStateProvider` is a small `useState` map keyed by `SettingsSectionKey` — no Zustand store is warranted for one phase-1 consumer.
- The Dialog header bar is the only place we i18n-resolve strings inside the package; per-section content stays the section author's responsibility.
