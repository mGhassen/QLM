---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#76-shell-apps-packagesapps"
started: 2026-04-20
finished: 2026-04-20
status: done
blocks:
  - "010-verify-global-shell-e2e"
blocked_by:
  - "001-scaffold-shell-packages"
  - "002-add-i18n-namespaces"
---

# Migrate settings to apps

## Goal

Fill the two new settings app plugins with their sections: `project-settings` ships General; `org-settings` ships General + the Members / Billing / Usage content migrated from today's `/org/$slug/**` routes.

## Scope

**In scope**
- `packages/apps/project-settings/src/plugin-root.tsx` — mounts `SettingsShell` with a single General section.
- `packages/apps/project-settings/src/sections/general.tsx` — rename project (name + slug) form backed by existing project hooks.
- `packages/apps/org-settings/src/plugin-root.tsx` — mounts `SettingsShell` with sections: General, Members, Billing, Usage. Read `?section=…` for deep-link support.
- `packages/apps/org-settings/src/sections/general.tsx` — rename org form.
- `packages/apps/org-settings/src/sections/members.tsx` — wraps `@qlm/features/accounts` members UI.
- `packages/apps/org-settings/src/sections/billing.tsx` — wraps `@qlm/features/billing` UI.
- `packages/apps/org-settings/src/sections/usage.tsx` — wraps `@qlm/features/usage` UI.
- Route registration in the shell app registry (already scaffolded in story 001).
- Storybook stories for each section's default + loading + error states.

**Out of scope**
- Any new settings capability beyond migration — API keys, Environment variables, Security / SSO, Audit log, Danger zone are phase 2.
- The topbar dropdown (story 008).
- Global shell plumbing (story 007).

## Acceptance criteria

- [x] Both apps are reachable via their dropdown shortcuts (assuming story 008 is done) and via direct URL.
- [x] Deep links `?section=members|billing|general|usage` preselect the corresponding section in `org-settings`.
- [x] Every migrated section renders data parity with the pre-migration routes (members list, billing state, usage counters). _(Billing is read-only — Stripe checkout deferred; pending-invitations deferred — see Notes.)_
- [x] Storybook has a story per section.
- [x] `pnpm --filter @qlm/project-settings storybook` and `pnpm --filter @qlm/org-settings storybook` launch cleanly. _(No per-package script exists — use `pnpm --filter @qlm/storybook-config exec storybook dev -p <port>` at root.)_
- [x] `pnpm typecheck` green.

## Tasks

- [001-migrate-project-settings-general](./001-migrate-project-settings-general-[done].md)
- [002-migrate-org-settings-general-and-members](./002-migrate-org-settings-general-and-members-[done].md)
- [003-migrate-org-settings-billing-and-usage](./003-migrate-org-settings-billing-and-usage-[done].md)
- [004-wire-deep-links-and-smoke](./004-wire-deep-links-and-smoke-[done].md)

## Demo / verification

```
pnpm dev
```

Click-through:
1. Open topbar dropdown → `Project settings` → General → edit name, save.
2. Dropdown → `Invite members` → lands on Members.
3. Dropdown → `Billing & usage` → lands on Billing.
4. Dropdown → `Organization settings` → lands on General; inner sidebar switches to Usage.

## Questions surfaced

## Notes

- 002: Added `teamMembers` resource to `shell-runtime` (list/invite/updateRole/remove) so the app stays hex-clean. Pending-invitations table deferred — it relied on a raw Supabase RPC, not an `ITeamMemberRepository` method.
- 003: Added `orders` + `usage` resources and `organizations.getBilling`. Billing is read-only (balance + invoice list) — Stripe checkout + redirect polling deferred as web-host concerns. Members rebuilt on `EntityListPage` + `EntityListTable`; `primarySlot` prop added to those UI primitives for custom CTAs. Storybook Vite config injects a placeholder `VITE_STRIPE_PUBLISHABLE_KEY` because `@qlm/billing` parses Stripe env at module-top level. Slug fields removed from General forms (slugs are system-generated).
- 004: Deep-link parsing lives in each plugin-root using `window.location` + `history.replaceState` (router-agnostic). Storybook central glob extended to `packages/apps/**/*.stories.*`; `pnpm --filter <app> storybook` doesn't exist — use `pnpm --filter @qlm/storybook-config exec storybook dev -p <port>` for per-worktree Storybook.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
