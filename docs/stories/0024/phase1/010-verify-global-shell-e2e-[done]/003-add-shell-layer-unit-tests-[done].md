---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - packages/shell-runtime/__tests__/resources/user-preferences.test.ts
  - packages/features/shell-topbar/__tests__/project-switcher-submenu-filter.test.tsx
  - packages/features/shell-topbar/__tests__/submenu-keyboard-nav.test.tsx
validation:
  kind: typecheck-only
---

# Add shell-runtime + shell-topbar unit tests

Cover the spec §10.2 bullets for the runtime and topbar layers: `userPreferences.setLastProject` writes through and invalidates the right React Query key; shell-topbar search filter, active-item checkmark, and submenu keyboard nav (↑/↓/Enter/Esc).

## Done when

- [ ] shell-runtime test builds a `QueryClient`, stubs the repositories, calls `setLastProject`, and asserts both the repository write and the exact `invalidateQueries` key.
- [ ] project-switcher-submenu filter test covers: empty query returns all, partial match filters, case-insensitive.
- [ ] Keyboard-nav test covers: ArrowDown/ArrowUp cycles focus, Enter selects, Escape closes without selecting.
- [ ] `pnpm --filter @qlm/shell-runtime test` and `pnpm --filter @qlm/shell-topbar test` both green.

## Notes

- Reuse existing test setup helpers under `packages/features/shell-topbar/__tests__/` (e.g. the provider wrapper).
- Active-item checkmark is implicitly covered by the filter test rendering the active-row indicator — add an explicit assertion there instead of a separate file.
