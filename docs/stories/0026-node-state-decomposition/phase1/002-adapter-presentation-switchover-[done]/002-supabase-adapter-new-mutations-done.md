---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/repositories/supabase/src/node.repository.ts
validation:
  kind: typecheck-only
---

# Implement `setLifecycle` / `setEligibility` / `setDrain` in Supabase adapter

Replaces the three throw-stubs from story 001 with real implementations.
Read paths join `public.node_drain` and apply `deriveNodeHealth` to populate
`node.drain` + `node.health`. All three writes use optimistic concurrency via
`expectedVersion`; conflict throws `DomainException(NODE_VERSION_CONFLICT_ERROR)`.

## Done when

- [ ] `setLifecycle`, `setEligibility`, `setDrain` write only the relevant columns / `node_drain` row — the legacy `lifecycle_status` is never touched (the trigger from task 001 maintains it).
- [ ] `findById` and `findByOrganizationId` return Nodes with populated `drain`, `lifecycle`, `orchestration`, `eligibility`, and `health` (derived).
- [ ] Version mismatch path returns the correct exception code.
- [ ] No call to `deriveNodeHealth` from inside the SQL — derivation is TS-only on read; SQL aggregations use the parity expressions from `health-thresholds.ts` (enforced in task 008).
- [ ] `pnpm --filter @guepard/repository-supabase typecheck` green.

## Notes

- `setDrain(id, null, version)` must DELETE the `node_drain` row, not write `active=false`. Mirror the Nomad semantics where drain absence ≠ inactive drain.
- A drain start sets `started_at = now()`; drain cancel clears `completed_at` only when the row is being deleted; otherwise the caller passes the explicit value.
