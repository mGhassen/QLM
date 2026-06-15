---
story: ./story.md
status: done
layer: host
files:
  - apps/web/package.json
  - apps/web/src/config/paths.config.ts
  - apps/web/src/routes/user/route.tsx
  - apps/web/src/routes/user/tokens.tsx
  - apps/web/src/components/account-menu
---

# Wire user-tokens into host app

## Purpose

Make `/user/tokens` reachable from the account dropdown, render a localized placeholder page, and add the routing helper + dependency — so the `@guepard/user-tokens` package scaffolded in task 001 is actually connected to the running web app.

## Files

- `apps/web/package.json` — add `@guepard/user-tokens` to `dependencies` (workspace protocol, matching the pattern of other feature deps).
- `apps/web/src/config/paths.config.ts` — export `createUserTokensPath()` returning `'/user/tokens'`. Add near the other `create*Path` helpers.
- `apps/web/src/routes/user/route.tsx` — pass-through layout route. Renders `<Outlet />` from `@tanstack/react-router`. Only create this file if `/user/*` needs a parent route per the repo's TanStack Router conventions (mirror how `/prj/$projectSlug/route.tsx` is handled — skip the file if a flat `user/tokens.tsx` alone is sufficient).
- `apps/web/src/routes/user/tokens.tsx` — the placeholder page. Uses `createFileRoute('/user/tokens')` from `@tanstack/react-router`. Renders a single heading. String source:
  - Prefer `useTranslation().t('tokens.page.title')` if the namespace resolves without error.
  - Otherwise render a literal `"Access tokens"` string wrapped in a `{/* TODO(003): replace with t('tokens.page.title') */}` comment so Story 003 can grep-replace it.
- `apps/web/src/components/account-menu/...` — exact path confirmed during implementation. Add one menu item labelled "Access tokens" (same localization fallback as the route file) that navigates via `createUserTokensPath()`. Place it near other account-scoped items (sign out, profile, etc.).

## Acceptance

- [ ] `pnpm install` succeeds after the dep is added.
- [ ] `pnpm typecheck` passes across `apps/web` and `@guepard/user-tokens`.
- [ ] `createUserTokensPath()` is exported from `apps/web/src/config/paths.config.ts`.
- [ ] The account dropdown in the running app (`pnpm web:dev`) shows an "Access tokens" item.
- [ ] Clicking the item navigates to `/user/tokens` and the placeholder page renders — no console errors, no missing-translation warnings (a `TODO(003)` marker on the literal string is acceptable; it gets cleaned up in Story 003).
- [ ] The route is auto-discovered by TanStack Router's file-based routing — no hand-edit to a central route registry.

## Test plan

```
pnpm install
pnpm typecheck
pnpm web:dev
# In a browser:
# 1. Sign in to any project.
# 2. Open the account dropdown (top-right avatar).
# 3. Click "Access tokens".
# 4. Confirm URL is /user/tokens and a placeholder heading renders.
```

## Notes

- If the account dropdown menu is driven by a config / enum (not a list of JSX children), add the new entry in the config rather than hardcoding JSX.
- Do NOT import anything from `@guepard/user-tokens/types` / `hooks` / `components` yet — those barrels are empty until Stories 002 / 008 / 009 land. Importing the package root (`@guepard/user-tokens`) is fine if you need the dep resolved.
- The `TODO(003)` comment must be a grep-visible literal string so Story 003 can locate and replace it deterministically.
