---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/apps/org-settings/src/plugin-root.tsx
  - packages/apps/project-settings/src/plugin-root.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/org-settings?section=members
  expect_console: empty
---

# Wire deep-links and smoke both settings apps

Reads `?section=...` from the URL in both plugin-roots so topbar-dropdown shortcuts land users on the intended section, then smokes the full click-through described in the story's Demo section.

## Done when

- [ ] `org-settings` plugin-root reads `?section=general|members|billing|usage` and preselects the matching section on mount; unknown or missing values fall back to `general`.
- [ ] `project-settings` plugin-root tolerates `?section=general` (only value defined) without warnings.
- [ ] Changing section inside the inner sidebar updates the URL query so deep links stay shareable.
- [ ] Chrome MCP smoke at `/prj/$projectSlug/org-settings?section=members` renders the Members table with no console errors.
- [ ] `pnpm typecheck` is green.

## Notes

- Deep-link parsing lives in the plugin-root, not inside `SettingsShell` — keep the shell a dumb list of sections.
- The dropdown wiring that fires these URLs ships in story 008 (already merged); this task only owns the landing side.
