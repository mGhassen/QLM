---
story: ./story.md
status: pending
layer: i18n
model: haiku
files:
  - apps/web/src/lib/i18n/locales/en/nodes.json
  - apps/web/src/lib/i18n/locales/en/topology.json
validation:
  kind: typecheck-only
---

# Drop legacy i18n keys + final sweep

Removes the `nodes.status.*` namespace, `topology.pressure.down`,
`topology.status.*` namespace. Final grep sweep for any remaining
`node\.status\b` / `NodeStatus\b` / `changeStatus\b` /
`STATUS_TO_SQL\b` / `statusCounts\b` / `STATUS_BADGE_CLASSES\b` /
`SQL_STATUS_TO_DOMAIN\b` / `STATUS_PRIORITY\b` references.

## Done when

- [ ] `nodes.status.*` keys gone.
- [ ] `topology.pressure.down` gone.
- [ ] `topology.status.*` keys gone.
- [ ] Sweep grep returns zero hits in `packages` + `apps` (excluding this story file + node_modules + .turbo).
- [ ] `pnpm typecheck && pnpm --filter @qlm/domain test && pnpm --filter server test && pnpm --filter @qlm/infrastructure test` all green.
- [ ] `pnpm build` green.

## Notes

- Story acceptance gate: full `pnpm check` after this task. If any package goes red, fix root cause — don't mask with eslint-disable or `as never`.
