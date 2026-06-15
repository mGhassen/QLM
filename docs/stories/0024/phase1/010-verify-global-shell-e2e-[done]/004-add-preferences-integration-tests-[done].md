---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/server/__tests__/routes/user-preferences.test.ts
  - packages/repositories/supabase/__tests__/user-preferences.repository.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/routes/user-preferences.test.ts
---

# Add server + adapter integration tests for user preferences

Cover spec §10.3: server routes `GET /api/me/preferences` and `PATCH /api/me/preferences` (empty row returns `{}`, patch merges, wrong-user context blocked, malformed body 400), and a supabase adapter round-trip patch+read.

## Done when

- [ ] Server test exercises each case using `createMockRepositories()` and Hono `app.request(...)`.
- [ ] Malformed-body case returns 400 from the zValidator layer.
- [ ] Adapter round-trip test uses the existing supabase test harness (or the repository's existing test fixture) to patch then read, confirming jsonb merge.
- [ ] `pnpm --filter server test -- __tests__/me-preferences.test.ts` green.

## Notes

- The RLS "wrong-user blocked" case is asserted at the repository/adapter level, not in the server mock test — if there's no adapter fixture, cover it inline with a stubbed rejection from the repo mock and assert the server returns the mapped error.
- Follow the existing server test pattern under `apps/server/__tests__/` for consistency.
