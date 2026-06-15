---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/components/last-project-redirect.tsx
  - apps/web/src/lib/i18n/locales/en/common.json
validation:
  kind: typecheck-only
---

# Add LastProjectRedirect component

Introduce a small host-side component that resolves the user's active organization, picks their last project for it (via `GetLastProjectService` + first-project fallback), and navigates to `/prj/<slug>`. Used as the landing target when `/` and `/organizations` redirects fire.

## Done when

- [ ] New file `apps/web/src/components/last-project-redirect.tsx` exports `LastProjectRedirect` (React component, no props).
- [ ] Resolution order:
  1. If no authed user → `<Navigate to="/auth/sign-in" />`.
  2. Read `repositories` from `useWorkspace()`, list organizations for the user, pick the first one (phase-1 proxy for "active org" until story 008 wires the explicit active-org selector).
  3. For that org, call `new GetLastProjectService(repositories.userPreferences).execute({ userId, organizationId })`. If `null`, fall back to `repositories.project.findAllByOrganizationId(orgId)[0]`.
  4. If a project is found → `<Navigate to={createProjectPath(project.slug)} replace />`.
  5. If the user has zero projects → render a minimal empty-state copy via `t('app.empty.noProjects')` (add the i18n key alongside; key only, copy as "You don't have any projects yet.").
- [ ] While resolving, render a centred spinner (reuse `Loader2` icon from `lucide-react` with `animate-spin`).
- [ ] `pnpm typecheck` green.

## Notes

- This is a host component; domain-service instantiation in a React layer is acceptable here because `useShell()` is unavailable (no `ShellAppProvider` on these routes).
- Don't introduce a new query hook — the resolution is single-shot and fire-on-mount. Use `useEffect` + component-level state, or `useQuery` with a one-shot key; either is fine.
- `createProjectPath` already exists in `apps/web/src/config/paths.config.ts`.
