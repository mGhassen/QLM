---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/routes/organizations.tsx
  - apps/web/src/routes/organizations/**
  - apps/web/src/routes/org/**
  - apps/web/src/routes/index.tsx
  - apps/web/src/config/paths.config.ts
  - apps/web/src/config/org.navigation.config.ts
  - apps/web/src/shell/project-shell-host.tsx
  - apps/web/src/components/dialogs/organization-dialog.tsx
  - apps/web/src/routes/join/index.tsx
  - apps/web/src/lib/billing/org-billing.server.ts
  - apps/web/src/routeTree.gen.ts
validation:
  kind: typecheck-only
---

# Redirect /organizations and /org/$slug/** routes

Delete every file under `apps/web/src/routes/organizations*` and `apps/web/src/routes/org/**`. Replace `/organizations/` with a single `<LastProjectRedirect />` render. Remove the doomed entries from `paths.config.ts` and rewrite every call site that still reaches for them. The `/org/$slug/*` URLs that Phase 1 still ships links to (billing/members/usage) are deferred to story 009's `org-settings` app; until then, any surviving reference must go through the `LastProjectRedirect` two-hop.

## Done when

- [ ] Deleted: `apps/web/src/routes/organizations.tsx`, every file under `apps/web/src/routes/organizations/**` (keep `index.tsx` replaced with the redirect below), and the entire `apps/web/src/routes/org/**` subtree (`$slug.tsx`, `$slug/{index,billing,members,usage}.tsx`, `$slug/project/**`).
- [ ] `apps/web/src/routes/organizations/index.tsx` — single-line component returning `<LastProjectRedirect />`.
- [ ] `apps/web/src/routes/index.tsx` — `/` renders `<LastProjectRedirect />` directly (not an intermediate `Navigate` to `/organizations`) to avoid a double redirect on the golden path.
- [ ] `apps/web/src/config/paths.config.ts` — remove `app.organizations`, `app.organization`, `app.organizationMembers`, `app.organizationBilling`, `app.organizationUsage`, `app.organizationSettings`. Keep `app.home = '/'` (auth callbacks + `sign-in.tsx` + `sign-up.tsx` still need a post-auth landing).
- [ ] `apps/web/src/shell/project-shell-host.tsx` — rewrite the 4 call sites that referenced the removed constants: `onSelectOrganization` → no-op placeholder (story 008 owns the org-switcher); `onViewAllOrganizations` + `onHomePageClick` → `navigate({ to: '/' })`.
- [ ] `apps/web/src/components/dialogs/organization-dialog.tsx` — on create-success, navigate to `/` (lands on the new org's first project via `LastProjectRedirect` as soon as the org list refreshes).
- [ ] `apps/web/src/routes/join/index.tsx` — the 3 references to `app.organization` / `app.home` rewrite to `/` (two-hop through `LastProjectRedirect`).
- [ ] `apps/web/src/lib/billing/org-billing.server.ts:145` — drop the `organizationBilling` path reference; return a placeholder or route to `/` until story 009 ships the org-settings billing section.
- [ ] `apps/web/src/config/org.navigation.config.ts` — delete the file; it's unreachable once `/org/$slug.tsx` is gone. Purge the import from any surviving consumer.
- [ ] `apps/web/src/routeTree.gen.ts` — regenerate via TanStack Router's generator (runs on `pnpm web:dev`); commit the regenerated tree so typecheck passes without a running dev server.
- [ ] `pnpm typecheck` green, `pnpm lint` green.

## Notes

- The `onSelectOrganization` stub is deliberate — phase 1 plans for story 008 to surface the org-switcher via the topbar dropdown, which talks to `shell.organizations.switchTo(...)`. Shimming that behaviour here would be speculative UI.
- `LastProjectRedirect` already covers the empty-org case — no need to replicate zero-org copy in the redirect routes.
- If `pnpm lint` surfaces unused imports inside `project-shell-host.tsx` after the rewrite, remove them; don't silence the rule.
