---
story: ./story.md
status: pending
layer: shell
model: haiku
files:
  - apps/web/src/shell/project-shell-host.tsx
validation:
  kind: typecheck-only
---

# Short-circuit handleTabClick on active tab

A click on the already-active tab is a no-op.

## Done when

- [ ] `handleTabClick` returns early when `tabId === activeTabId`.
- [ ] `useCallback` deps include `activeTabId` alongside `navigate`.
- [ ] `pnpm typecheck` green.

## Notes

- Three lines of change. Lowest-risk task in the story; lands last.
