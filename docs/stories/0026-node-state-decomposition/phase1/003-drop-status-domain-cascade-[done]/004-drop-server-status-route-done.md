---
story: ./story.md
status: pending
layer: server
model: sonnet
files:
  - apps/server/src/routes/nodes.ts
  - apps/web/src/lib/msw/handlers/nodes.ts
  - apps/web/src/lib/msw/fixtures/nodes.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/nodes-state.test.ts
---

# Drop `POST /api/nodes/:id/status` route + MSW handler

The legacy single-axis mutation route is gone. MSW handler removed too;
fixture seed loop drops the legacy `status` field on each Node and
keeps the five-axis fields as the primary source of truth.

## Done when

- [ ] `POST /api/nodes/:id/status` Hono handler deleted.
- [ ] MSW `http.post('/api/nodes/:id/status', ...)` handler deleted.
- [ ] MSW node fixture seed populates only the five-axis fields (no `status`, no `healthState`).
- [ ] Existing route tests (`nodes-state.test.ts`) still 18/18 green.
- [ ] Pool MSW handler + node fixture aggregation no longer touch `statusCounts` (counts the new fields only).

## Notes

- Server kept the band-heuristic for codes 3100/3101/3102 in `http-utils` — leave it. Code 3001 (legacy version conflict for changeStatus) can be cleaned out of MSW response bodies but the constant in `Code` stays for now.
