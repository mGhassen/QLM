---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/shell-topbar/src/project-switcher-submenu.tsx
  - packages/features/shell-topbar/src/org-switcher-submenu.tsx
  - packages/features/shell-topbar/src/project-switcher-submenu.stories.tsx
  - packages/features/shell-topbar/src/org-switcher-submenu.stories.tsx
  - packages/features/shell-topbar/__tests__/project-switcher-submenu.test.tsx
  - packages/features/shell-topbar/__tests__/org-switcher-submenu.test.tsx
  - packages/features/shell-topbar/src/index.ts
validation:
  kind: typecheck-only
---

# Add project + org switcher submenus

Two presentational submenus: `ProjectSwitcherSubmenu` and `OrgSwitcherSubmenu`. Shared shape — search input, scrollable list with checkmark on active row, divider, `+ New X` row. Org rows also render a role badge (`owner` / `administrator` / `viewer`). Keyboard support per spec §3.2.

## Done when

- [ ] `project-switcher-submenu.tsx` exports `ProjectSwitcherSubmenu` with props `{ projects: { id; slug; name }[], activeProjectId, onSelect(id), onCreate(): void, onClose(): void }`.
- [ ] `org-switcher-submenu.tsx` exports `OrgSwitcherSubmenu` with props `{ organizations: { id; slug; name; role: 'owner'|'administrator'|'viewer' }[], activeOrgId, onSelect(id), onCreate(): void, onClose(): void }`.
- [ ] Both: search filter is client-side, case-insensitive on `name` + `slug`; `+ New X` stays visible at the bottom regardless of filter.
- [ ] Keyboard: `↑` / `↓` cycles through list items (including the `+ New X` row); `Enter` fires `onSelect(id)` or `onCreate()`; `Esc` fires `onClose`. Wrap at edges.
- [ ] Storybook stories per component: `Default`, `EmptyFilter` (search excludes everything), `ManyRows` (50+ items scrolling), `SingleItem`, `WithError` (optional inline error slot).
- [ ] Unit tests: search filter excludes non-matches + always keeps the `+ New X` row; keyboard nav moves selection + wraps + `Enter` fires the right callback; `Esc` calls `onClose`.
- [ ] `pnpm typecheck` green; `pnpm --filter @qlm/shell-topbar test` green.

## Notes

- Keep both components pure presentation — no `useShell()`, no fetching. The parent (task 004) passes already-loaded lists.
- Role badge: a tiny Shadcn `Badge` variant is fine; palette should match the `owner/administrator/viewer` semantics used elsewhere (grep `features/accounts` for the existing mapping).
- Aria roles: `role="menu"` on the listbox, `role="menuitem"` per row, `aria-selected` on the active + focused row.
