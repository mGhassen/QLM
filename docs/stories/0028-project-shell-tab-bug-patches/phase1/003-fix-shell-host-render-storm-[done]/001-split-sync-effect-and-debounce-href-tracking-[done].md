---
story: ./story.md
status: pending
layer: shell
model: sonnet
files:
  - apps/web/src/shell/project-shell-host.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/infrastructure
  expect_console: empty
---

# Split host sync effect and debounce href tracking

Replace the single 90-line `useEffect` at lines 214-306 with three single-purpose effects. Debounce the href-watching one with `useDebouncedValue` from `@guepard/ui/hooks/use-debounced-value`.

## Done when

- [ ] `useDebouncedValue` imported from `@guepard/ui/hooks/use-debounced-value`. `const debouncedHref = useDebouncedValue(location.href, 150);` near the top of the component body.
- [ ] Effect A "ensure virtual tab exists" — deps `[virtualTab?.id, virtualTab?.title, activeTabId]`. Upserts only the membership; never writes hrefs.
- [ ] Effect B "ensure contextual tab exists" — deps `[activeTabId, projectSlug]`. Adds the contextual record with `createProjectAppPath(projectSlug, activeTabId)` only when missing; never writes hrefs.
- [ ] Effect C "track current href on existing tabs" — deps `[debouncedHref, activeTabId, virtualTab?.id, location.pathname]`. Computes `currentHref = normalizeHref(debouncedHref)` and `contextualHref = buildContextualHref(debouncedHref)`. Writes only when an existing record's stored href is different.
- [ ] `parseRouteBaseFromPathname(pathname)` extracted as a module-scope helper; reused inside the effects and the `activeRouteBase` memo.
- [ ] `openTabsRef` (lines 202-205) untouched.
- [ ] `pnpm typecheck` green.

## Notes

- One write per typing pause is the success criterion. Do not chase zero writes — `saveTabs` must still persist eventual state.
- The debounce delay (150 ms) is conservative; a tab switch immediately after typing flushes the pending state because effect C's deps include `activeTabId`.
