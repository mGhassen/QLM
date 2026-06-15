---
spec: docs/specs/0026-node-state-decomposition-phase1.md
spec_sections:
  - "#3-resolved-open-questions"
  - "#65-deletions-end-of-phase-2"
status: done
started: 2026-04-27
finished: 2026-04-28
blocks: ["004-drop-status-presentation", "005-drop-status-db-and-i18n"]
blocked_by: ["002-adapter-presentation-switchover"]
---

# Drop deprecated Node.status — domain + adapter + runtime + server + topology

## Goal

Remove `Node.status`, `Node.healthState`, `INodeRepository.changeStatus`, `shell.nodes.changeStatus`, and the server status route. Sweep the matching cascade through every layer that the domain types reach: supabase + HTTP + server-stub adapters, server routes, shell-runtime resource, topology pkg + MSW handlers + fixtures.

This story is the first of three (003 → 004 → 005) that together close out RFC 0026 §6.5. Split rationale: 003 owns domain + cascade; 004 sweeps the `@qlm/infrastructure` presentation pkg; 005 finishes DB schema 49 + pressure-aliases + i18n keys.

## Scope

**In scope**

- Drop `Node.status` and `Node.healthState` from domain Zod schema + `NodeEntity` class.
- Drop `NodeStatus`, `NODE_STATUSES`, `NodeHealthState`, `NODE_HEALTH_STATES` exports.
- Drop `INodeRepository.changeStatus` abstract method + supabase + web HTTP + server stub implementations.
- Drop `shell.nodes.changeStatus` mutation. Drop server `POST /api/nodes/:id/status` route.
- Drop `Pool.statusCounts` + `FleetSummary.statusCounts` + MSW pool aggregation entry.
- Drop `STATUS_TO_SQL`, `SQL_STATUS_TO_DOMAIN`, `SQL_HEALTH_TO_DOMAIN` constants in supabase repo.
- Drop deprecated topology `STATUS_DOT` / `STATUS_TILE` / `STATUS_FILL` constants.
- Update MSW fixtures + handlers to construct nodes via the 5-axis state directly (no `status` field, no `healthState`).
- Update domain tests (`node.type.test.ts`, `node-services.test.ts`, `fleet-aggregate.test.ts`) for the new contract.

**Out of scope (moved to 004 + 005)**

- `@qlm/infrastructure` presentation pkg sweep (card.tsx, detail-page.tsx, details-sheet.tsx, story-fixtures, hooks) — story 004.
- DB schema 49 cleanup migration (drop trigger → fn → column → enum) — story 005.
- `PressurePointKind` legacy aliases (`high-cpu`, `high-mem`, `down`) — story 005.
- `nodes.status.*` + `topology.pressure.kind.down` i18n keys — story 005.

## Acceptance criteria

- [x] `pnpm --filter @qlm/domain typecheck && test` green.
- [x] `pnpm --filter @qlm/repository-supabase typecheck` green.
- [x] `pnpm --filter @qlm/shell-runtime typecheck` green.
- [x] `pnpm --filter server typecheck` green.
- [x] `pnpm --filter @qlm/topology typecheck` green.
- [x] `pnpm --filter web typecheck` green.
- [x] No new ESLint disables.
- [x] Story 003 leaves only `@qlm/infrastructure` typecheck red (deferred to story 004).

## Tasks

1. [001-drop-domain-status-field](001-drop-domain-status-field-done.md)
2. [002-drop-port-and-adapters-changeStatus](002-drop-port-and-adapters-changeStatus-done.md)
3. [003-drop-runtime-changeStatus](003-drop-runtime-changeStatus-done.md)
4. [004-drop-server-status-route](004-drop-server-status-route-done.md)
5. [005-drop-statusCounts-and-msw](005-drop-statusCounts-and-msw-done.md)

## Demo / verification

```bash
# All packages except @qlm/infrastructure typecheck green
pnpm typecheck 2>&1 | grep -v 'infrastructure:typecheck'

# Old surface gone in domain
grep -rn 'NodeStatus\b\|NODE_STATUSES\b\|NodeHealthState\b\|changeStatus\b' \
  packages/domain packages/repositories packages/shell-runtime apps/server
# expect: zero

# Old surface gone in MSW + topology
grep -rn 'node\.status\b\|statusCounts\b' \
  apps/web/src/lib/msw packages/features/ops/topology
# expect: zero

pnpm --filter @qlm/domain test
```

## Deviations from spec

- Original story 003 bundled DB cleanup + presentation sweep + i18n keys. Working-tree blast radius (~30 files in `@qlm/infrastructure`, plus DB schema) exceeded the 1–8 task cap and the inline-fix scope rule. Split into 003 / 004 / 005 per advisor recommendation. RFC 0026 §6.5 deletions still close at end of story 005.
