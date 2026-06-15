---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#321-settings-dialog--shell"
  - "#76-settings-shell-package-packagesfeaturessettings-shell"
  - "#79-host-app-appsweb"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "011-build-tokens-settings-pane-and-inline-sub-flows"
blocked_by:
  - "003-seed-user-tokens-i18n-namespace"
---

# Build settings dialog shell

## Goal

Ship the generic `@qlm/settings-shell` package (new in AM-1) and the `<SettingsDialogMount>` component in `apps/web` — so the tokens pane in Story 011 has a place to render, and the account-menu "Settings" button (placeholder from Story 001 task 003) can open a real, working shell with the two-pane layout described in spec §3.2.1.

## Scope

**In scope**

- New workspace package `packages/features/settings-shell/` scaffolded per spec §7.6 — `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`. Dependencies: `@qlm/domain`, `@qlm/i18n`, `@qlm/ui`, `zod`. Subpath exports: `./components`, `./types`.
- `packages/features/settings-shell/src/types/settings-section.ts` — `SettingsSection`, `SettingsSectionKey` types per spec §3.2.1.
- `packages/features/settings-shell/src/components/settings-dialog.tsx` + stories + tests — Radix `Dialog` with the two-pane shell (left nav + right outlet). Props exactly per spec §3.2.1. Implements the `confirm()` guard on close when a section signals "dirty" via a slot-level imperative ref or context (spec leaves the implementation detail to the implementer; this story picks the cleanest one).
- `packages/features/settings-shell/src/components/settings-sidebar.tsx` + stories — left-nav vertical list. Props: `sections: SettingsSection[]`, `activeKey: SettingsSectionKey`, `onSelect: (key: SettingsSectionKey) => void`.
- `packages/features/settings-shell/src/index.ts` — public exports.
- Storybook stories for every component state: open with zero sections (degenerate), open with one section (typical phase 1), open with three sections (future-proof visual).
- `apps/web/src/components/settings-dialog-mount.tsx` — thin host-app component that:
  - Owns the `open: boolean` state.
  - Exposes an imperative opener via a new `SettingsDialogContext` (a small `React.createContext` shipped from the host app or the settings-shell package — decide during implementation).
  - Composes `<SettingsDialog>` from `@qlm/settings-shell` with the Story-011 `<TokensSettingsPane>` from `@qlm/user-tokens` as the single phase-1 section.
  - Renders once at the app root (e.g. in `__root.tsx`), wrapped around the app content so the context is available everywhere.
- Replace the Story-001 **task 003 stub** account-menu handler (a `console.log` or `alert`) with the real `useSettingsDialog().open()` via the context.
- `apps/web/package.json` — add `@qlm/settings-shell` as a workspace dep.

**Out of scope**

- The `<TokensSettingsPane>` itself (→ Story 011). Until Story 011 lands, `<SettingsDialogMount>` passes in a stub component (e.g. `<TokensPanePlaceholder />` that lives in this story and gets replaced by the real pane in Story 011).
- Any `tokens.*` i18n keys or `tokens.*` content (→ Story 011).
- Any TanStack Query wiring (→ Story 008 / 011).
- Sub-flow inline components (create form, reveal view, revoke confirm) — all belong to Story 011.

## Acceptance criteria

- [x] `@qlm/settings-shell` package scaffolded and `pnpm --filter @qlm/settings-shell typecheck` + `test` both pass (10 tests, 93 % line coverage).
- [x] `<SettingsDialog>` renders a Radix `Dialog` with a two-pane layout. Close via X / Escape / overlay all work — verified by stories + 6 unit tests.
- [x] `<SettingsSidebar>` renders each section as a clickable row; active row uses `bg-accent` + `aria-current="page"`; clicking a non-active row calls `onSelect(key)`. Verified by 4 unit tests + 4 stories (`Empty`, `OneItem`, `ThreeItems`, `WithIcons`).
- [x] Dialog stories: `OneSection`, `ThreeSections`, `DiscardGuardClean`, `DiscardGuardDirty`.
- [x] `<SettingsDialogMount>` is mounted inside `AuthenticatedProviders` (right above `WorkspaceProvider`'s children) so the context is available everywhere a signed-in user could see a menu.
- [x] All FOUR call sites now wire the real opener — `apps/web/src/routes/organizations.tsx`, `apps/web/src/routes/org/$slug.tsx`, `apps/web/src/routes/org/$slug/project/$projectSlug.tsx`, `apps/web/src/shell/project-shell-host.tsx` — see Changelog (the spec implied two; the repo actually has four).
- [x] Dirty-state discard guard: `DiscardGuardDirty` story uses `useMarkSectionDirty(key)` to register dirtiness, and `confirm("Discard unsaved changes?")` fires on close. Behaviour user-validated 2026-04-16.
- [x] All `settings.*` i18n keys from spec §11 are resolved via `t(...)` / `useTranslation('settings')` — no hardcoded English in the new package.
- [x] All new components are typed with `Readonly<Props>`.
- [x] `pnpm --filter @qlm/settings-shell test` coverage 93 % line / 76 % branch on the shell — above the 80 % line bar.

## Tasks

1. [001-scaffold-settings-shell-package](001-scaffold-settings-shell-package-[pending].md) — features. New `@qlm/settings-shell` workspace package with empty barrels.
2. [002-implement-settings-shell-components](002-implement-settings-shell-components-[pending].md) — features. `SettingsDialog` + `SettingsSidebar` + `DirtyStateProvider` + stories + tests.
3. [003-wire-settings-dialog-mount-in-host](003-wire-settings-dialog-mount-in-host-[pending].md) — shell. Mount the dialog once at app root, expose opener context, swap the two stub `onSettingsClick` handlers.

## Demo / verification

```bash
pnpm --filter @qlm/settings-shell storybook
# Browse: SettingsShell/SettingsDialog — one-section, three-sections, discard-guard stories
# Browse: SettingsShell/SettingsSidebar — empty, one item, three items

pnpm web:dev
# 1. Sign in, open the account-menu dropdown.
# 2. Click "Settings".
# 3. SettingsDialog opens; left nav shows "Personal tokens" (stub content — placeholder until Story 011).
# 4. Esc / X / overlay all close the dialog.

pnpm --filter @qlm/settings-shell test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped, with one wiring deviation logged in the Changelog: spec §3.2.1 / §7.9 implied the Settings opener needed two call-site wirings (the legacy `UserProfileMenu` in `organizations.tsx` and the `ShellUserProfileMenu` in `project-shell-host.tsx`). Reality: there are FOUR call sites — the two listed plus `apps/web/src/routes/org/$slug.tsx` (the org-detail page using `RootLayout`) and `apps/web/src/routes/org/$slug/project/$projectSlug.tsx` (the project route using `<ShellUserProfileMenu>` inline). All four now call `useSettingsDialog().open()`. First-pass shipped only the two named in the spec; user reported the missing wiring on `/org/$slug` during validation; fixed before story-finish.
