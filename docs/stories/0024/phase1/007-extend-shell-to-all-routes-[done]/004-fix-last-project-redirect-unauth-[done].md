---
story: ./story.md
status: done
layer: bugfix
model: sonnet
parent_task: 003-smoke-test-org-redirects-[blocked].md
files:
  - apps/web/src/components/last-project-redirect.tsx
validation:
  kind: ui-smoke
  route: /organizations
  expect_console: empty
---

# Fix: LastProjectRedirect throws useWorkspace on unauth sessions

## Reproduction

`ui-validator` navigated to `http://localhost:3007/organizations` with a signed-out session. The final URL (`/auth/sign-in?next=%2Forganizations`) is correct, but before the redirect settles React logs a caught error + pageerror:

```
Error: useWorkspace must be used within a WorkspaceProvider
    at useWorkspace (…/workspace-context.tsx:8:11)
    at LastProjectRedirect (…/last-project-redirect.tsx:18:28)
The above error occurred in the <LastProjectRedirect> component. React will try to recreate this component tree from scratch using the error boundary you provided, CatchBoundaryImpl.
```

`expect_console: empty` fails on that. No network 5xx.

## Likely cause

`LastProjectRedirect` calls `useWorkspace()` unconditionally at the top of the component, before the `if (!isUserLoading && !hasUser) return <Navigate to={pathsConfig.auth.signIn} replace />` early return. `WorkspaceProvider` is only mounted inside the authed provider tree, so on a signed-out render the hook throws and the error boundary catches it — but the error still logs.

React hooks must render in a stable order, so the cleanest shape is: make `LastProjectRedirect` short-circuit to `<Navigate to={pathsConfig.auth.signIn} replace />` before calling any hook that requires the authed tree. Extract the authed resolution (the `useQuery` + `useWorkspace()` calls) into a nested child component that's only rendered when `hasUser` is true.

## Files to touch

- `apps/web/src/components/last-project-redirect.tsx` — split into two components: top-level `LastProjectRedirect` returns `<Navigate>` for the unauth + loading cases without touching `useWorkspace()`; a nested `AuthedLastProjectRedirect` owns the workspace-dependent resolution and is only rendered when `user.data?.id` is truthy.

## Done when

- [ ] The parent task's `ui-smoke` at `/organizations` reports `PASS` with empty console.
- [ ] No new console exceptions or network 5xx introduced.
- [ ] The parent task's `[blocked]` pointer is cleared and it re-runs `/finish`.

## Notes

- The hydration mismatch `<script>` vs `<p>Loading...` surfaced by `ui-validator` is a pre-existing issue from `root-providers.tsx`, not caused by story 007. Out of scope for this bugfix — if it blocks the next smoke run, escalate with the user.
- Hook ordering is the constraint: the early-return must come before any hook that can throw. `useUser()` is safe because it's declared in an always-mounted supabase provider.
