---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#31-information-architecture"
  - "#77-host-routing--layout-appsweb"
started: 2026-04-19
finished: 2026-04-19
blocks:
  - "010-verify-global-shell-e2e"
blocked_by: []
---

# Extend shell to all routes

## Goal

Make the shell layout (topbar + project sidebar + avatar footer) render on every authed route except `/auth/*` and onboarding, and remove the standalone `/organizations` landing in favour of a redirect.

## Scope

**In scope**
- `apps/web/src/routes/__root.tsx` — host the shell layout wrapper; branch to exclude `/auth/*` and onboarding routes.
- Delete `apps/web/src/routes/organizations.tsx` and any associated child routes under `apps/web/src/routes/organizations/*` that are no longer reachable.
- Add a redirect at `/organizations` → the active org's last project (via `shell.organizations.switchTo` + router redirect).
- Delete or convert to thin redirects: `apps/web/src/routes/org/$slug/{billing,members,usage,index}.tsx`, which will be replaced by the `org-settings` app's deep links in story 009.
- Update any stale links / path helpers in `apps/web/src/config/paths.config.ts`.

**Out of scope**
- The topbar trigger / dropdown / submenus (story 008).
- The settings apps themselves (story 009).
- Any persistence or domain work.

## Acceptance criteria

- [x] Visiting `/organizations` redirects to the active org's last project.
- [x] Every previously-plain-routed path (org billing, org members, etc.) is either removed, or redirects to the corresponding `org-settings` deep link (placeholder until story 009 lands content).
- [x] `/auth/*` and onboarding routes render **without** the shell (unchanged).
- [x] `pnpm typecheck` green; `pnpm lint` green.
- [x] Manual smoke: reload the app on a project page, an org page, and `/organizations` — the shell renders on the first two and the last one redirects.

## Tasks

1. [001-add-last-project-redirect](./001-add-last-project-redirect-[done].md) — small `<LastProjectRedirect />` component that resolves the user's active org + last project and navigates to `/prj/<slug>`.
2. [002-redirect-all-org-routes](./002-redirect-all-org-routes-[done].md) — delete `/organizations` + `/org/$slug/**` routes, add redirects, rewrite `paths.config.ts` + its consumers.
3. [003-smoke-test-org-redirects](./003-smoke-test-org-redirects-[done].md) — `ui-smoke` visiting `/organizations`, asserts the page resolves without console errors.
4. [004-fix-last-project-redirect-unauth](./004-fix-last-project-redirect-unauth-[done].md) — bugfix: early-return to `/auth/sign-in` before calling `useWorkspace()`.

## Demo / verification

```
pnpm dev
```

Click-through:
1. `/prj/<slug>/dashboard` → shell present.
2. `/organizations` → redirect to `/prj/<last-slug>/...`.
3. `/auth/sign-in` → no shell.

## Notes

- 001 uses `useTranslation()` with an explicit `common:` namespace prefix — the app's default namespace chain starts at `account`, not `common`. New keys landed under `common.app.empty.*`.
- 002 wasn't starteable per SDD invariant: main's `pnpm check` was red at `/start-story` time (broken `desktop` typecheck). User pushed `86ee9d1 fix: unblock pnpm check on main` + `59d561d chore(sdd): enforce green main via main-stabilizer agent + pre-commit hook` mid-story; worktree rebased onto that before this task committed.
- 002 kept `createOrganizationBillingPath` in place with a placeholder return (`/`) instead of deleting it — story 009 will wire it to the org-settings app's billing deep-link, and deleting/renaming now would churn a callsite that's about to move.
- 003 failed the first ui-smoke with a `useWorkspace must be used within a WorkspaceProvider` error on unauth renders → bugfix 004 split `LastProjectRedirect` into a top-level guard + an `AuthedLastProjectRedirect` child so the workspace hook only runs when `userId` is truthy. Re-run smoke landed on `/auth/sign-in` clean (pre-existing hydration + refresh-token noise unrelated to story 007).

## Questions surfaced

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
