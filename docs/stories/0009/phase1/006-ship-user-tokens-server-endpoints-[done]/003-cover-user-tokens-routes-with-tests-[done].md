---
story: ./story.md
status: pending
layer: tests
files:
  - apps/server/__tests__/user-tokens.test.ts
---

# Cover user-tokens routes with tests

## Purpose

Vitest integration tests against the in-memory mock factory: assert HTTP status, response shape, and the account-scoping invariant for all three routes.

## Files

- `apps/server/__tests__/user-tokens.test.ts`:
  - Use `createApp({ getRepositories: async () => mockRepos })` and `app.request(...)` to exercise routes — same pattern as the other server tests.
  - Stub the current-account helper by either: (a) injecting an `accountId` via a custom test header that the route reads when no Bearer token is present (test-only), OR (b) preferring per-route option injection if `createApp` supports it. Pick the simplest pattern that keeps prod auth strict and tests readable; document the chosen approach inline.
  - Cases:
    - `POST /user-tokens` with valid input → 201, response has `row.id` (UUID), `row.token_name`, `row.scopes`, `row.expires_at`, `revoked: false`, `revoked_at: null`, AND `rawJwt` matching `mock.jwt.<row.id>`.
    - `POST /user-tokens` with no session → 401.
    - `POST /user-tokens` with invalid input (empty `token_name`, empty `scopes`, `expires_at <= now`, `expires_at > now + 365d`) → 400.
    - `GET /user-tokens` returns `[]` for an account with none.
    - `GET /user-tokens` returns only the rows owned by the requesting account (create rows for two accounts; assert the response excludes the other account's rows).
    - `POST /user-tokens/:id/revoke` happy path → 200, response row has `revoked: true` + `revoked_at: <iso>`.
    - `POST /user-tokens/:id/revoke` for unknown id → 404 with code `USER_TOKEN_NOT_FOUND_ERROR` (3000).
    - `POST /user-tokens/:id/revoke` second time on the same id → 404 (the spec consolidates already-revoked into NOT_FOUND for phase 1; the deviation, if accepted, is logged in the spec changelog).

## Acceptance

- [ ] All 9 cases pass.
- [ ] Test file follows the existing `apps/server/__tests__/*.test.ts` shape (no new helper directories).
- [ ] No real Supabase / DB / network calls.
- [ ] `pnpm --filter server exec vitest run __tests__/user-tokens.test.ts` is green.

## Test plan

```
pnpm --filter server exec vitest run __tests__/user-tokens.test.ts
```

## Storybook validation

N/A — not a UI task.

## Notes

- The pre-existing `@mlc-ai/web-llm` test crash affects other test files but not this one (this file does not import the chat or notebook routes).
- If a 409 vs 404 distinction lands later (separate "already revoked" branch in the service), this test grows a 9th case.
