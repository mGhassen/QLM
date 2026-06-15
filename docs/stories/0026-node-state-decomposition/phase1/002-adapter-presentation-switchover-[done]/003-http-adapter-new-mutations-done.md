---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - apps/web/src/lib/repositories/node.repository.ts
validation:
  kind: typecheck-only
---

# Implement HTTP adapter mutations

Replaces the three throw-stubs in the web HTTP adapter with `POST` calls to the
new server endpoints (delivered in task 004). Mirrors the request shape from
spec §5.2; serialises `NodeDrain` per the wire schema.

## Done when

- [ ] `setLifecycle` posts `{ lifecycle, expectedVersion }` to `/api/nodes/:id/lifecycle`.
- [ ] `setEligibility` posts `{ eligibility, expectedVersion }` to `/api/nodes/:id/eligibility`.
- [ ] `setDrain` posts `{ drain, expectedVersion }` to either `/api/nodes/:id/drain` (start) or `/drain/cancel` (when `drain` is `null`).
- [ ] 409 maps to `NODE_VERSION_CONFLICT_ERROR`; 404 to `NODE_NOT_FOUND_ERROR`; 400 to `NODE_VALIDATION_ERROR`.
- [ ] `pnpm --filter web typecheck` green.

## Notes

- Server is the single network boundary — domain stays unaware of HTTP.
- Request bodies validated server-side too; this adapter trusts but the server re-zods.
