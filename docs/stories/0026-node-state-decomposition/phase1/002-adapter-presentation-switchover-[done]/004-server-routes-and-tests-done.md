---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/routes/nodes.ts
  - apps/server/__tests__/nodes-state.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/nodes-state.test.ts
---

# Add 4 POST endpoints + tests for the new state axes

Hono routes per spec §5.2: `POST /api/nodes/:id/{drain, drain/cancel,
eligibility, lifecycle}`. Each handler instantiates the matching domain
service with `repos.node`, validates the body via `zValidator`, surfaces
domain exceptions through `handleDomainException`.

## Done when

- [ ] All four endpoints registered with `zValidator('json', schema)`.
- [ ] Each happy path returns 200 with the updated `NodeOutput`.
- [ ] 400 on schema fail, 404 on not-found, 409 on version mismatch — covered by tests.
- [ ] `nodes-state.test.ts` covers happy + 400 + 404 + 409 for all four endpoints (≥16 cases).
- [ ] `pnpm --filter server test __tests__/nodes-state.test.ts` green.

## Notes

- Reuse the `createMockRepositories()` helper — no live DB.
- Drain endpoint accepts the optional `setIneligibleOnStart` flag (default `true`); cancel accepts optional `keepIneligible`.
