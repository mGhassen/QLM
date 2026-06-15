---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - packages/shell-runtime/src/resources/nodes.ts
validation:
  kind: typecheck-only
---

# Add `shell.nodes.{drain, drainCancel, setEligibility, setLifecycle}`

Each method instantiates the matching domain service with the injected node
repository, runs `execute(input)`, and invalidates the right query keys.

## Done when

- [ ] All four mutations exposed under `shell.nodes` with promise return types matching `NodeOutput`.
- [ ] After every mutation, the runtime invalidates: `nodes.detail`, `nodes.list`, `fleet.summary`, `fleet.pools`, `fleet.pressure`.
- [ ] Project context auto-injected (no caller passes `projectId` / `orgSlug`).
- [ ] `pnpm --filter @guepard/shell-runtime typecheck` green.

## Notes

- Invalidation is mandatory — pool aggregations depend on the new mutation results being re-fetched.
- Optimistic-concurrency is server-side only; the runtime surfaces conflicts as React Query errors.
