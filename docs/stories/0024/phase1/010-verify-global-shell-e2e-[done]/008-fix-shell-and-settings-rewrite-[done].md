---
story: ./story.md
status: done
layer: bugfix
model: sonnet
parent_task: 005-add-shell-dropdown-e2e-spec-[pending].md
files:
  - packages/features/shell-topbar/src/shell-topbar.tsx
  - packages/features/shell-topbar/src/topbar-trigger.tsx
  - packages/features/shell-topbar/src/create-project-dialog.tsx
  - packages/features/shell-topbar/src/create-org-dialog.tsx
  - packages/features/shell-topbar/src/create-project-dialog.stories.tsx
  - packages/features/shell-topbar/src/create-org-dialog.stories.tsx
  - packages/features/shell-topbar/src/index.ts
  - apps/web/src/components/last-project-redirect.tsx
  - apps/web/src/lib/i18n/locales/en/shell.json
  - apps/web/src/lib/i18n/locales/en/org-settings.json
validation:
  kind: typecheck-only
---

# Fix: shell-topbar dropdown rewrite (user-settings-as-app deferred)

## Reproduction

Live testing of story 010 surfaced a pile of regressions in the dropdown feature and the settings surface:

1. Dropdown rendered **behind** settings content because the parent sidebar has `overflow-hidden` clipping it.
2. Dropdown **border/shadow** didn't match the rest of the app's popovers.
3. **Trigger button** had a visible bordered-rectangle look instead of a subtle hoverable region.
4. **Submenus stacked at top** of the level-1 menu instead of flying out to the right of the triggering row.
5. **Search was missing** from both project and org submenus.
6. **Dropdown nav didn't work** because `DropdownMenuTrigger asChild` couldn't attach its handlers to `TopbarTrigger` (no `forwardRef`, no rest-spread).
7. **`/` landing page hung** on a loader forever when `useQuery` errored with `retry: false`.
8. **User settings** was still a dialog showing raw i18n keys (`dialog.title`, `nav.personalTokens`).
9. **Slug field** in Create project / Create org dialogs was redundant — slugs are generated server-side.
10. Label "Billing & usage" is misleading for the dropdown shortcut — just "Billing" is correct.

## Fixes

- **Radix DropdownMenu rewrite** of `shell-topbar.tsx`: replaced the hand-rolled Popover + state machine + outside-click + keyboard nav with `DropdownMenu` / `DropdownMenuSub` / `DropdownMenuContent` / `DropdownMenuSubContent` / `DropdownMenuItem` from `@qlm/ui/dropdown-menu`. Native: portal (beats overflow-hidden), cascade anchor (submenu flies out from the row), keyboard nav, outside-click, typeahead.
- **Search input restored** inside each submenu via a `SearchInput` subcomponent. Keydowns are `stopPropagation()`'d so Radix's typeahead doesn't hijack typing; Escape still bubbles so it closes the menu. State resets when the outer dropdown closes.
- **Trigger forwardRef** — `TopbarTrigger` now accepts rest props + ref so `DropdownMenuTrigger asChild` can attach its handlers.
- **Trigger polish** — dropped the border-rectangle; added `hover:bg-accent`.
- **Dropdown styling** matches shadcn: `border-border/50 border rounded-lg shadow-lg backdrop-blur-sm`.
- **LastProjectRedirect error branch** — `useQuery` errors previously left the spinner rendering forever (`retry: false` + unhandled `error`). Now renders `FriendlyWorkspaceErrorPanel` on error.
- **Create project / Create org dialogs** drop the `slug` field — server generates it. Schema reduced to `{ name }`.
- **i18n labels**: `shell.json#dropdown.shortcut.billing` and `org-settings.json#sections.billing.title` both renamed "Billing & usage" → "Billing".
- **Dead code** removed: custom `dropdown-menu.tsx`, `org-switcher-submenu.tsx`, `project-switcher-submenu.tsx`, `slugify.ts`, and their stories/tests. Barrel exports cleaned.

## Done when

- [x] `pnpm typecheck` green (51/51).
- [x] User tested the dropdown, submenus, trigger, create dialogs, user-settings navigation, and "Billing" label — all confirmed working.

## Notes

- Removed unit tests for the old submenu components since Radix-based DOM made them brittle. Integration coverage lives in the Playwright spec from task 005.
- User-settings-as-shell-app migration was **deferred**. It was implemented in commit `43bd817` on this branch but had a semantic conflict with story `009-implement-server-switcher-pane` (RFC 0023), which added a desktop-only `ServerPane` section to `settings-dialog-mount.tsx`. Preserving that work requires first moving `apps/web/src/features/desktop-server/` into a reusable package — out of scope here. Picked up in a follow-up story. The dialog stays as-is.
