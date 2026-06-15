---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#321-profile-section-prjsluguser-settings-sidebar--profile"
  - "#33-user-flows-happy-paths"
  - "#51-data-shapes"
  - "#71-domain-packagesdomain"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
  - "#73-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-package-packagesfeaturesuser-profile"
  - "#76-shell-app-packagesappsuser-settings"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-24
finished: 2026-04-27
blocks: [002, 003, 004]
blocked_by: []
---

# Add profile name card

## Goal

A signed-in user opens **Settings → Profile** and can update their display name; the new value appears in the topbar and user menu without a page reload.

## Scope

**In scope**

- New `packages/features/user-profile` package skeleton (manifest, tsconfig, eslint, Storybook config mirroring `packages/features/accounts`).
- Domain: `PersonalAccountSchema` entity, `IAccountRepository` port with `getMine` + `updateMine`, `GetPersonalAccountService`, `UpdatePersonalAccountService`, supporting DTOs + `InvalidProfileInputException`.
- Adapter: `packages/repositories/supabase/src/personal-account.repository.ts` with `getMine` + `updateMine`; wiring in `apps/web/src/lib/repositories-factory.ts`.
- Shell runtime: `shell.personalAccount.getMine()` + `shell.personalAccount.updateMine({ name })`, shared React Query key `['personal-account', userId]`.
- Presentation: `UserProfileSectionUI` container, `NameCard` (read-only first, then editable RHF form + submit), Storybook stories + component tests.
- Shell app: `packages/apps/user-settings/src/sections/profile.tsx`, registered **above** Personal tokens in `plugin-root.tsx`.
- Topbar avatar/name component (`packages/ui/src/qlm/shell/shell-user-profile-menu.tsx`) switched to the shared query key so updates propagate without reload (resolves open question #1).

**Out of scope** (forces honest slicing)

- Profile picture upload / clear — story 002.
- Password card, identity-linked warning, re-auth — story 003.
- MFA card, factor list, enrollment dialog — story 004.
- Any schema change — phase 1 has none (spec §6.1).
- New server routes — phase 1 has none (spec §5.2).

## Acceptance criteria

- [x] Navigating to `/prj/{slug}/user-settings` shows the new **Profile** section as the default sidebar item, above **Personal tokens**.
- [x] The Name card displays the signed-in user's current `accounts.name`.
- [x] Submitting a new non-empty name persists it and returns an updated entity (toast: *Profile updated*).
- [x] The topbar avatar menu reflects the new name without a page reload.
- [x] Submitting an empty name shows an inline validation error and does not call the adapter.
- [x] `IAccountRepository` is consumed by `shell.personalAccount.*`; no React component imports the Supabase client directly.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm --filter @qlm/domain test`, and `pnpm --filter @qlm/user-profile test` all pass. (Project-wide `pnpm --filter @qlm/storybook-config build-storybook` fails on a preexisting `vite-plugin-top-level-await` × esbuild target issue inherited from `main`; not introduced by this story — see Notes.)

## Tasks

1. [001-scaffold-profile-with-readonly-name](001-scaffold-profile-with-readonly-name-[done].md) — plugin · ui-smoke · ✅
2. [002-wire-personal-account-data-spine](002-wire-personal-account-data-spine-[done].md) — adapter · domain-test · ✅
3. [003-make-name-card-editable-and-propagate](003-make-name-card-editable-and-propagate-[done].md) — features · ui-smoke · ✅

## Demo / verification

1. `pnpm supabase:web:start && pnpm dev`
2. Sign in as a seeded user at http://localhost:3000.
3. Click the user avatar → **User settings**. Sidebar shows **Profile** (selected) above **Personal tokens**.
4. The **Your Name** card shows the current name.
5. Change the name, click *Update Profile*. Toast confirms success. Topbar menu reflects the new name without refresh.
6. Clear the name field and submit. Confirm inline error; adapter is not called (Network tab).
7. Reload the page. New name persists.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — **no**: i18n locale path divergence noted in spec §Changelog (2026-04-27).
