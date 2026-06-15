---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/shell-topbar/src/dropdown-menu.tsx
  - packages/features/shell-topbar/src/dropdown-menu.stories.tsx
  - packages/features/shell-topbar/src/index.ts
validation:
  kind: typecheck-only
---

# Add level-1 dropdown menu

Presentational `DropdownMenu` with PROJECT + ORGANIZATION sections separated by a divider, plus the shortcut rows from spec §3.2 (`Invite members`, `Billing & usage`, `Organization settings`, `Project settings`). Stays prop-driven; composition with `useShell()` lives in task 004.

## Done when

- [ ] `dropdown-menu.tsx` exports `DropdownMenu` with props: `{ activeOrg: { name; logoInitial; logoColor }, activeProject: { name }, isLoading, error?, onOpenProjectSubmenu, onOpenOrgSubmenu, onNavigate(routeBase, section?): void, onClose(): void }`. All text via `useTranslation('shell')` — reuse existing keys from story 002.
- [ ] Level-1 layout mirrors spec §3.2: active-project row (chevron → submenu), `Project settings` shortcut, divider, active-org row (chevron → submenu), `Invite members`, `Billing & usage`, `Organization settings` shortcuts. Each shortcut calls `onNavigate('project-settings' | 'org-settings', sectionKey?)`.
- [ ] Loading → skeleton rows on the two active-entity rows only; shortcuts stay clickable. Error → inline "Couldn't load" message, no crash.
- [ ] Keyboard: `Esc` calls `onClose`. `↑`/`↓` move focus within the menu. `Enter` on a chevron row opens its submenu.
- [ ] Storybook stories: `Default`, `Loading`, `Error`, `LongOrgName` (overflow handling).
- [ ] `index.ts` re-exports `DropdownMenu` + its prop types.
- [ ] `pnpm typecheck` green; `pnpm --filter @qlm/shell-topbar test` green.

## Notes

- Use Shadcn primitives from `@qlm/ui` — `DropdownMenu`-like Radix wrappers if available, else handcrafted with `role="menu"` + `role="menuitem"` and the aria-activedescendant pattern.
- Do NOT import `react-i18next/Trans` — eslint enforces `@qlm/ui/trans`. For pure `t()` calls, `useTranslation('shell')` from `react-i18next` is the conventional pattern.
- The active-project and active-org rows MUST have `aria-haspopup="menu"` + `aria-expanded` driven by whichever submenu is open (parent manages state — this task just wires the attribute through).
