---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  # Anchors updated 2026-04-14 after RFC 0009 AM-1 renumbered §7.x and rewrote §3.2.
  - "#75-presentation--feature-package-packagesfeaturesuser-tokens"
  - "#79-host-app-appsweb"
  - "#321-settings-dialog--shell"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks:
  - "002-define-user-token-domain-types"
  - "003-seed-user-tokens-i18n-namespace"
blocked_by: []
---

# Scaffold user-tokens surface

## Goal

Create the empty `packages/features/user-tokens` package, a `/user/tokens` placeholder route, the "Access tokens" account-menu item, and the `createUserTokensPath` helper — so clicking the account dropdown renders a reachable placeholder page that every later story builds on.

## Scope

**In scope**

- Create `packages/features/user-tokens/` with `package.json`, `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`. Mirror the shape of an existing feature package (e.g. `packages/features/datasources`).
- `package.json` exposes `./types`, `./hooks`, and `./components` subpath exports (pointing at empty files for now) so Stories 002/008/009 can fill them without a second package-boundary change.
- Create `apps/web/src/routes/user/tokens.tsx` as a placeholder page rendering a single localized heading. Uses `t('tokens.page.title')` with a `TODO(003)` note if the key does not yet exist — Story 003 replaces the fallback.
- Create `apps/web/src/routes/user/route.tsx` pass-through layout if the TanStack Router file-based conventions require it.
- Add `createUserTokensPath()` to `apps/web/src/config/paths.config.ts` returning `/user/tokens`.
- Add an "Access tokens" menu item to the existing account-menu component (exact path confirmed during implementation; typically `apps/web/src/components/account-menu/*`). The item uses `createUserTokensPath()`.
- Add `@guepard/user-tokens` to `apps/web/package.json` dependencies.

**Out of scope**

- Any domain types, Zod schemas, DTOs (→ Story 002).
- The `tokens` i18n namespace (→ Story 003).
- Any real component — `TokenListView`, dialogs, primitives (→ Stories 009–011).
- Any adapter, server endpoint, or middleware (→ Stories 005–007).

## Acceptance criteria

Rewritten mid-story to reflect RFC 0009 AM-1. The original criteria (pre-amendment) referenced `/user/tokens` route + `createUserTokensPath` + "Access tokens" menu label — all removed by task 003. Current criteria reflect what actually shipped.

- [x] `pnpm install` succeeds after the new `@guepard/user-tokens` workspace package is added.
- [x] `pnpm typecheck` passes across `@guepard/user-tokens`, `@guepard/ui`, and `apps/web`.
- [x] `packages/features/user-tokens/package.json` declares `./types`, `./hooks`, `./components` subpath exports so Stories 002 / 008 / 009 / 011 do not need to renegotiate the package boundary.
- [x] No `/user/tokens` route exists in the router — `grep routeTree.gen.ts UserTokens` returns zero.
- [x] `createUserTokensPath` is NOT exported from `paths.config.ts`; no callers reference it; no `user: { tokens }` stanza in the config object.
- [x] Account-menu dropdown (both `UserProfileMenu` in `/organizations` layout and `ShellUserProfileMenu` in the project shell) shows a **"Settings"** nav-item button between "Home Page" and "Help", using the `Settings` lucide icon.
- [x] The pre-existing unused gear-icon Settings button in the menu header is still present; its prop is now `onProfileSettingsIconClick` (renamed from `onSettingsClick` by AM-1).
- [x] Clicking the "Settings" nav-item fires a stub `console.log` handler with a `TODO(story-010)` comment — Story 010 replaces the stub with the real `<SettingsDialog>` opener via `<SettingsDialogMount>` context.
- [x] Storybook validation (SDD rule §Storybook, added 2026-04-14): `user-profile-menu.stories.tsx` updated to include `onProfileSettingsIconClick` + 3 new stories (`WithoutGearIcon`, `WithoutSettingsNavItem`, `Minimal`); new `shell-user-profile-menu.stories.tsx` file created with 7 parallel stories. User visually validated both story sets.

## Tasks

1. [001-scaffold-user-tokens-feature-package](001-scaffold-user-tokens-feature-package-[done].md) ✅ — features layer. Empty `@guepard/user-tokens` workspace package with four public-export subpaths.
2. [002-wire-user-tokens-into-host-app](002-wire-user-tokens-into-host-app-[done].md) ✅ — host layer. Path helper, route stub at `/user/tokens`, account-menu entry in both `UserProfileMenu` and `ShellUserProfileMenu`, and package dependency. **Partially superseded by task 003** (AM-1): the route and the path helper get deleted; the menu entry gets relabeled. The package-dependency addition and the `Key` icon import survive. Task 002's done status reflects the work landed, not its final correctness — task 003 overlays the fixes.
3. [003-unwire-direct-route-and-relabel-menu](003-unwire-direct-route-and-relabel-menu-[done].md) ✅ — host layer. Deleted `/user/tokens` route + `createUserTokensPath`, relabeled the account-menu entry to "Settings", swapped `onAccessTokensClick` → `onSettingsClick` on both `UserProfileMenu` and `ShellUserProfileMenu` (renamed the existing unused gear `onSettingsClick` → `onProfileSettingsIconClick`), wired both call sites to a stub console-log handler. Story 010 replaces the stub with the real opener.

## Demo / verification

Rewritten mid-story per AM-1 (original referenced `/user/tokens` which no longer exists).

```bash
# 1. Clean install + typecheck
pnpm install
pnpm typecheck

# 2. Confirm the route tree has no /user/tokens entry
grep -c "UserTokens\|user/tokens" apps/web/src/routeTree.gen.ts   # expect: 0

# 3. Confirm createUserTokensPath is gone
grep -c "createUserTokensPath" apps/web/src/config/paths.config.ts apps/web/src/routes/organizations.tsx apps/web/src/shell/project-shell-host.tsx
# expect: 0 across the board

# 4. Confirm the menu renames landed
grep -c "onAccessTokensClick" packages/ui/src/guepard/layout/user-profile-menu.tsx packages/ui/src/guepard/shell/shell-user-profile-menu.tsx
# expect: 0 (prop was renamed to onSettingsClick)
grep -c "onProfileSettingsIconClick" packages/ui/src/guepard/layout/user-profile-menu.tsx packages/ui/src/guepard/shell/shell-user-profile-menu.tsx
# expect: ≥ 2 per file (type + destructure + JSX)

# 5. Storybook visual check (SDD gate)
pnpm --filter @guepard/ui storybook
# Open:
#   Design System/Layouts/User Profile Menu/Default      → "Settings" nav-item visible
#   Design System/Shell/Shell User Profile Menu/Default  → same

# 6. Live app
pnpm web:dev
# - Sign in, open account dropdown from both the /organizations layout and any project shell.
# - See "Settings" item (not "Access tokens").
# - Click it → browser console shows the stub log; no navigation. Real dialog ships in Story 010.
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. `yes` — post-amendment anchors (updated mid-story on 2026-04-14) now point at `§7.5`, `§7.9`, and `§3.2.1` under RFC 0009 AM-1. The AM-1 deviation itself is already recorded in the spec's Changelog (entry dated 2026-04-14).

## Notes — amendment in flight

RFC 0009 **Amendment AM-1** (2026-04-14, unblocked the same day): post-scaffold UX review pivoted from a direct `/user/tokens` route to a Settings dialog with inline pane states. The RFC's `## Amendments` appendix, the spec's §1 Q3 / §3.1 / §3.2 / §7.5 / §7.6 (new) / §7.9 / §11 / §12 / Changelog, and the downstream stories (new Story 010 "build settings dialog shell"; merged Story 011 "build tokens settings pane and inline sub-flows"; Story 012 retargeted) all landed. Task 003 below carries out the host-side undo in this story. Tasks 001 and 002 stay marked done — task 003 overlays their corrections rather than retconning history.
