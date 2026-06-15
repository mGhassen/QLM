---
spec: docs/specs/0026-node-state-decomposition-phase1.md
spec_sections:
  - "#3-resolved-open-questions"
  - "#65-deletions-end-of-phase-2"
status: done
started: 2026-04-28
finished: 2026-04-28
blocks: ["005-drop-status-db-and-i18n"]
blocked_by: ["003-drop-status-domain-cascade"]
---

# Drop deprecated Node.status — `@guepard/infrastructure` presentation sweep

## Goal

Sweep all `node.status` / `NodeStatus` / `changeStatus` reads out of `packages/features/ops/infrastructure`. Replace per-status presentation (badges, color tokens, quick-action buttons, hooks) with the existing `getNodeDisplayState(node)` abstraction + 5-axis primitives (`node.lifecycle`, `node.eligibility`, `node.drain`, `node.health`).

After this story, `pnpm typecheck` is green across the whole repo.

## Scope

**In scope**

- `src/index.ts` — drop `NODE_STATUSES`, `NODE_HEALTH_STATES`, `NodeStatus`, `NodeHealthState` re-exports.
- `src/application/view-state.serde.ts` — drop `NodeStatus` import + any `status`-keyed serializer.
- `src/application/use-actions.ts`, `src/application/use-data.ts`, `src/application/use-flashing.ts`, `src/application/use-page.ts` — drop `shell.nodes.changeStatus` mutation + status-driven action wiring; replace with the 5-axis equivalents (`drain` / `setEligibility` / `setLifecycle`) already exposed on `shell.nodes`.
- `src/presentation/components/card.tsx` — drop `status`-driven badge + chip; render `getNodeDisplayState(node)` with the existing `HealthStatusBadge`.
- `src/presentation/components/detail-page.tsx`, `details-sheet.tsx` — drop the status quick-action row + `NODE_STATUSES` select; surface drain / eligibility / lifecycle controls via the existing 5-axis components added in story 002.
- `src/presentation/components/detail-cpu-section.tsx`, `detail-memory-section.tsx`, `detail-storage-section.tsx` — replace `node.status === 'running'` reads with `node.lifecycle === 'active'` (or `getNodeDisplayState(node) === 'running'`, depending on intent).
- `src/presentation/components/command-palette.tsx` — drop status-keyed quick filters (replace with lifecycle / eligibility).
- `src/presentation/story-fixtures.ts` — drop `status` writes; emit 5-axis fixtures.

**Out of scope**

- Any DB schema change — story 005.
- i18n key removal — story 005.
- New 5-axis UX (already shipped in story 002).
- `PressurePointKind` legacy alias removal — story 005.

## Acceptance criteria

- [ ] `pnpm typecheck` green across the whole repo (no `@guepard/infrastructure` red).
- [ ] `pnpm --filter @guepard/infrastructure test` green.
- [ ] `grep -rn 'node\.status\b\|NodeStatus\b\|changeStatus\b' packages/features/ops/infrastructure` returns zero.
- [ ] Storybook for the `@guepard/infrastructure` pkg renders the same surfaces with the new fixture shape.
- [ ] No new ESLint disables.

## Tasks

(scaffolded by `/start-story` when this story enters `[wip]`. Expected ~5 tasks, all `layer: features`, `model: sonnet`.)

## Demo / verification

```bash
pnpm typecheck
grep -rn 'node\.status\b\|NodeStatus\b\|changeStatus\b' packages/features/ops/infrastructure
# expect: zero
pnpm --filter @guepard/infrastructure test
pnpm --filter @guepard/infrastructure storybook  # smoke
```
