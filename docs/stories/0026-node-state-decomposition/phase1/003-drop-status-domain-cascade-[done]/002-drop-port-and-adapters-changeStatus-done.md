---
story: ./story.md
status: pending
layer: domain
model: sonnet
files:
  - packages/domain/src/repositories/node-repository.port.ts
  - packages/repositories/supabase/src/node.repository.ts
  - apps/web/src/lib/repositories/node.repository.ts
  - apps/server/src/lib/node-repository.stub.ts
validation:
  kind: typecheck-only
---

# Drop `INodeRepository.changeStatus`

Remove the abstract method + 3 adapter implementations + the
`STATUS_TO_SQL` / `SQL_STATUS_TO_DOMAIN` enum maps in the supabase
adapter. Adapter `deserialize` no longer reads `lifecycle_status`.

## Done when

- [ ] Abstract method gone from port.
- [ ] All 3 adapters (supabase, web HTTP, server stub) compile without `changeStatus`.
- [ ] No grep hit for `STATUS_TO_SQL`, `SQL_STATUS_TO_DOMAIN` outside this story file.
- [ ] `pnpm --filter @qlm/domain typecheck` + `pnpm --filter @qlm/repository-supabase typecheck` + `pnpm --filter web typecheck` + `pnpm --filter server typecheck` green.

## Notes

- Adapter `deserialize`: drop `status:` line + `STATUS_BADGE_*` references in this layer; presentation owns the display vocabulary now.
