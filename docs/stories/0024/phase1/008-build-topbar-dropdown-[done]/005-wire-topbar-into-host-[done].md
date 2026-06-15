---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/shell/project-shell-host.tsx
  - apps/web/package.json
  - pnpm-lock.yaml
  - packages/features/shell-topbar/src/shell-topbar.tsx
validation:
  kind: ui-smoke
  route: /
  expect_console: empty
---

# Wire ShellTopbar into the host

Replace the legacy `ShellOrgDropdown` in `project-shell-host.tsx`'s topbar header slot with the new `<ShellTopbar />`. This is the first time the dropdown hits a real route.

## Done when

- [ ] `apps/web/src/shell/project-shell-host.tsx` imports `ShellTopbar` from `@guepard/shell-topbar` and passes `onNavigate={(path) => void navigate({ to: path })}` (using `useNavigate` from `@tanstack/react-router`).
- [ ] The legacy `ShellOrgDropdown` import + usage is removed; any stale props / callbacks on `<ProjectShellLayout header={...}>` (the old `onSelectOrganization`, `onCreateWorkspace`, `onViewAllOrganizations`) are cleaned up.
- [ ] If `<ProjectShellLayout>` still requires a `header` prop with specific shape, the slot simply becomes `<ShellTopbar onNavigate={...} />`.
- [ ] `pnpm typecheck` green; `pnpm --filter web lint` green (unused-import errors blocked).
- [ ] Preview smoke at `/` after sign-in: `LastProjectRedirect` lands on `/prj/<slug>/dashboard`, the new topbar trigger renders `[org] [caret] <project name>`, clicking it opens the level-1 dropdown. Console clean of story-007-unrelated noise (pre-existing hydration + refresh-token lines are out of scope per story 007 Notes).

## Notes

- Don't re-add anything ShellOrgDropdown-specific. If some useWorkspace / useQuery feeding it becomes dead code after the swap, delete it with the same commit.
- `onNavigate` is the only thing `ShellTopbar` needs from the host. If that signature doesn't feel right during wiring, come back to task 004 and refine — it's cheaper than teaching two call sites a workaround.
