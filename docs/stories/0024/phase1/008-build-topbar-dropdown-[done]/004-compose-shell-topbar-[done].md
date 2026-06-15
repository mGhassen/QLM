---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/shell-topbar/src/shell-topbar.tsx
  - packages/features/shell-topbar/src/shell-topbar.stories.tsx
  - packages/features/shell-topbar/__tests__/shell-topbar.test.tsx
  - packages/features/shell-topbar/src/index.ts
  - packages/features/shell-topbar/package.json
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Compose ShellTopbar with state machine + shell hooks

`ShellTopbar` is the composite that wires Trigger ↔ DropdownMenu ↔ Submenus ↔ Dialogs. It reads live data from `useShell()` and writes via the same client (`projects.create`, `organizations.create`, `organizations.switchTo`, `userPreferences.setLastProject`). Router-agnostic: the caller injects an `onNavigate(path)` prop.

## Done when

- [ ] `shell-topbar.tsx` exports `ShellTopbar` with props `{ onNavigate(path: string): void }`. Nothing else.
- [ ] State machine (`useReducer` or a discriminated-union `useState`): `{ closed } | { level1 } | { submenu: 'project' | 'org' } | { dialog: 'create-project' | 'create-org' }`. Transitions:
  - Trigger click → `level1`.
  - Level-1 active-project row `›` → `submenu: 'project'`.
  - Level-1 active-org row `›` → `submenu: 'org'`.
  - Submenu `+ New project` → `dialog: 'create-project'`.
  - Submenu `+ New organization` → `dialog: 'create-org'`.
  - Any submenu row select → close everything AFTER the async navigation resolves.
  - `Esc` anywhere OR outside-click → `closed`.
- [ ] Data plumbing (all via `useShell()`):
  - Lists: `useQuery` against `shell.organizations.list()` (keys via `shell.organizations.keys.all`) and `shell.projects.list({ organizationId: shell.orgSlug-resolved-to-id })`. Both already cached — no explicit fetch on open.
  - Project switch: call `shell.userPreferences.setLastProject(orgId, nextProjectId)` then `onNavigate(createProjectPath(nextProjectSlug))`. Use `@/config/paths.config` helper — wait, this package can't import from `apps/web`. Instead, the CALLER passes the full path via a `pathBuilder` prop? No — simpler: return slug from the submenu + let `onNavigate` receive the slug, and the caller builds the path. Redesign: `onNavigate(path)` stays, and `shell-topbar` builds the path as `/prj/<slug>`. That's a one-liner, acceptable.
  - Org switch: `const { slug } = await shell.organizations.switchTo(nextOrgId); onNavigate('/prj/' + slug);`.
  - Project create: `const project = await shell.projects.create({ organizationId, name, slug });` → `onNavigate('/prj/' + project.slug);` → `shell.projects.invalidate.list(organizationId)`.
  - Org create: `const org = await shell.organizations.create({ name, slug });` → await a tick for the DB trigger's default project (see story 007 notes), then `const { slug: projectSlug } = await shell.organizations.switchTo(org.id); onNavigate('/prj/' + projectSlug);`. Invalidate `shell.organizations.keys.all`.
- [ ] Error handling: `shell.projects.create` / `organizations.create` rejections surface as `serverError` on the dialog (string form of the error message). Other mutation failures toast via `sonner` + log via `@qlm/shared/logger.warn`.
- [ ] Keyboard: `Esc` always closes (root-level listener while `level1/submenu/dialog`). Outside-click closes `level1/submenu` but NOT `dialog` (modal traps focus).
- [ ] Storybook stories: `DefaultClosed`, `Level1Open`, `ProjectSubmenuOpen`, `OrgSubmenuOpen`, `CreateProjectDialog`, `CreateOrgDialog`. Use a MockShellProvider / `ShellAppProvider` harness that injects fake repositories.
- [ ] Unit test: clicking trigger opens level-1; clicking active-project row opens project submenu; clicking a project row calls `onNavigate` with the right path and fires `setLastProject`; `Esc` closes.
- [ ] `pnpm typecheck` green; `pnpm --filter @qlm/shell-topbar test` green.

## Notes

- Do NOT import from `apps/web/*` — features packages are forbidden to. Any path helper must be inlined or reimplemented in a small private helper.
- `shell.orgSlug` is the org's slug in context. To turn it into `orgId` for list queries, use the org list: `orgs.find(o => o.slug === shell.orgSlug)?.id`. For speed, memoize.
- `@tanstack/react-query` is a peer dep of `@qlm/shell-runtime`; `@qlm/shell-topbar` can `useQuery` directly since it's already on the catalog.
