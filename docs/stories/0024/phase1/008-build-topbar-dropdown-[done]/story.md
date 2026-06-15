---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#33-user-flows-happy-paths"
  - "#75-presentation--feature-packages"
started: 2026-04-19
finished: 2026-04-19
blocks:
  - "010-verify-global-shell-e2e"
blocked_by:
  - "001-scaffold-shell-packages"
  - "002-add-i18n-namespaces"
  - "006-wire-user-preferences-runtime"
---

# Build topbar dropdown

## Goal

Ship the topbar trigger, the two-level dropdown with PROJECT and ORGANIZATION sections, the project and org switcher submenus, and the inline create-project / create-organization modal dialogs.

## Scope

**In scope**
- `packages/features/shell-topbar/src/topbar-trigger.tsx` — `[org logo] [caret] <project name>`.
- `packages/features/shell-topbar/src/dropdown-menu.tsx` — level-1 menu with PROJECT + ORGANIZATION sections, divider, shortcuts (no ACCOUNT).
- `packages/features/shell-topbar/src/project-switcher-submenu.tsx` — search + list + checkmark + `+ New project`.
- `packages/features/shell-topbar/src/org-switcher-submenu.tsx` — search + list with role badge + `+ New organization`.
- `packages/features/shell-topbar/src/create-project-dialog.tsx`, `create-org-dialog.tsx` — inline modals with name + slug fields, validated via Zod.
- Wire the dropdown into the topbar slot in `apps/web` via the shell-runtime hooks (`shell.organizations.switchTo`, `shell.userPreferences`, `shell.organizations.list`, `shell.projects.listForActiveOrg`, `shell.projects.create`, `shell.organizations.create`).
- Keyboard: `Esc` closes any open menu; `↑` / `↓` / `Enter` navigate submenus; outside-click closes.
- Storybook stories for every component state (default, search filtering, loading, error).

**Out of scope**
- The settings apps the shortcuts open (story 009).
- Shell layout / route wiring (story 007).
- i18n key creation (story 002) — consume existing keys.

## Acceptance criteria

- [x] Clicking the trigger opens/closes the level-1 dropdown.
- [x] Clicking the active-project row's `›` opens the project submenu with search + list + `+ New project`.
- [x] Clicking a different project routes to it and records the preference via `userPreferences.setLastProject`.
- [x] Clicking a different org routes to that org's last project via `organizations.switchTo`.
- [x] `+ New project` opens a modal; submitting creates a project and switches to it.
- [x] `+ New organization` opens a modal; submitting creates an org + default project and switches to both.
- [x] `Esc` closes any open menu without navigating.
- [x] Storybook renders every component; no console exceptions.
- [x] Unit tests for search filter + keyboard nav pass.

## Tasks

1. [001-add-dropdown-menu-level1](./001-add-dropdown-menu-level1-[done].md) — level-1 menu with PROJECT + ORGANIZATION sections + divider + shortcuts.
2. [002-add-switcher-submenus](./002-add-switcher-submenus-[done].md) — project + org submenus with search, keyboard nav, unit tests.
3. [003-add-create-dialogs](./003-add-create-dialogs-[done].md) — create-project + create-org modal dialogs (Zod + react-hook-form).
4. [004-compose-shell-topbar](./004-compose-shell-topbar-[done].md) — `ShellTopbar` composite wiring state machine + shell hooks.
5. [005-wire-topbar-into-host](./005-wire-topbar-into-host-[done].md) — mount `<ShellTopbar />` in `project-shell-host.tsx`, replace legacy `ShellOrgDropdown`.

## Demo / verification

```
pnpm --filter @guepard/shell-topbar storybook
pnpm --filter @guepard/shell-topbar test
pnpm dev
```

Open the app, click the trigger, walk through switch project → switch org → create project → create org.

## Questions surfaced

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
