---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/web/src/lib/msw/handlers/nodes.ts
validation:
  kind: typecheck-only
---

# Extend MSW handlers for the four new endpoints

Same in-memory store as the existing handlers. Drain countdown is synthetic
(deadline timestamp echoed back; no real timers). Version is incremented per
mutation. Conflicts return 409.

## Done when

- [ ] Handlers for `POST /api/nodes/:id/{drain, drain/cancel, eligibility, lifecycle}` registered.
- [ ] Drain start writes a `NodeDrain` shape onto the in-memory node and flips eligibility unless `setIneligibleOnStart === false`.
- [ ] Drain cancel either deletes the drain row (default) or keeps it `active=false` based on the `keepIneligible` flag.
- [ ] Storybook + Vite dev server load without console errors after changes.
- [ ] `pnpm --filter web typecheck` green.

## Notes

- No backend orchestrator simulation — `orchestration` axis is left untouched by MSW (matches the rule: only adapters/server may write it).
- Treat MSW as a contract mirror; presentation tests rely on it for happy paths.
