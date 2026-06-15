---
story: ./story.md
status: done
layer: features
model: sonnet
files: []
validation:
  kind: ui-smoke
  route: /organizations
  expect_console: empty
---

# Smoke-test /organizations redirect

Drive a browser at `/organizations` in the running preview (web=3007, server=4007) and confirm:
- Navigation resolves without red console errors.
- An authed session lands on `/prj/<slug>/...` (path starts with `/prj/`).
- A signed-out session lands on `/auth/sign-in` (acceptable — the resolver bounces unauthenticated users there via `<Navigate to="/auth/sign-in" />`).
- No 5xx on any network call fired during the load.

## Done when

- [ ] `ui-validator` returns `PASS`.
- [ ] No console errors, no unhandled promise rejections.

## Notes

- No new files. Pure validation gate. Inline fixes during validation must stay within the task's `files:` (empty here) — any app fix required becomes a `BUG_COMPLEX` bugfix task.
- If the preview env hasn't been started, run `pnpm preview` from the worktree before invoking `/finish` on this task.
- Auth state of the browser session is whatever the last manual session left in the preview's Supabase DB; both landing states above are acceptable.
- Blocked by [004-fix-last-project-redirect-unauth](./004-fix-last-project-redirect-unauth-[pending].md) — `useWorkspace()` is called before the unauth early-return, throwing on signed-out renders and violating `expect_console: empty`.
