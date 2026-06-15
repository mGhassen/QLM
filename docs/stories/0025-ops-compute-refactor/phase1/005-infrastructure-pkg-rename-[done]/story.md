---
spec: docs/specs/0025-ops-compute-refactor-phase1.md
spec_sections:
  - "#5-conceptual-model"
  - "#7-file-by-file-work-items"
  - "#75-presentation--feature-packages"
  - "#76-shell-apps-packagesappsname"
  - "#77-i18n"
status: pending
started: null
finished: null
blocks: ["006-per-node-detail-sections"]
blocked_by: ["001-tabid-protocol", "004-fleet-runtime-resource"]
---

# Rename @guepard/nodes → @guepard/infrastructure and absorb the dying pkg

## Goal

Single canonical Infrastructure package. Rename `@guepard/nodes` to `@guepard/infrastructure`, absorb the activity + settings + replicas surfaces from the dying `@guepard/infrastructure`, delete cluster/provider/overview tabs (covered now by Topology + Pool entity), and update every consumer.

## Scope

**In scope**

- Delete the dying `packages/features/ops/infrastructure/` (after carving out the kept files).
- `git mv packages/features/ops/nodes/ packages/features/ops/infrastructure/`.
- Rename `package.json:name` → `@guepard/infrastructure`. Add `exports['./types']: './src/application/types.ts'` to preserve the MSW import path.
- Absorb from the dying pkg:
  - `infrastructure-activity-section.tsx`, `infrastructure-settings-tab.tsx`, `infrastructure-replicas-section.tsx` → merged pkg's `presentation/components/`.
  - `application/use-activity-data.ts`, `application/use-infrastructure-settings.ts`, `application/use-replicas.ts`, `application/compute-tiers.ts` → merged pkg's `application/`.
  - Carve `Replica`, `ReplicaStatus`, `InfrastructureSettings`, `InfrastructureActivity`, `ActivityDataPoint` out of the dying `application/types.ts` into the merged pkg's `application/types.ts`. Drop cluster/provider/region view-models.
- Add `infrastructure-page.tsx` — wrapper that switches between nodes-list / activity / settings on a `view` query param.
- Update `useInfrastructurePage`-equivalent hook (or inline) to consume `shell.fleet.summary` for fleet numbers.
- Rename component exports `NodesPluginRoot → InfrastructurePluginRoot`, `NodesListPage → InfrastructureListPage`, etc. Update `apps/infrastructure` plugin-root to import the new names.
- Update `packages/apps/infrastructure/package.json` dep `@guepard/nodes` → `@guepard/infrastructure`.
- Update `apps/web/package.json` workspace deps. The dying `@guepard/infrastructure` dep already exists; after rename it points at the merged pkg. Confirm version pin.
- Merge `apps/web/src/lib/i18n/locales/en/nodes.json` into `infrastructure.json` under `node.*` subprefix. Delete `nodes.json`. Remove `'nodes'` from `apps/web/src/lib/i18n/i18n.settings.ts:defaultI18nNamespaces`.
- Move every `useTranslation('nodes')` call to `useTranslation('infrastructure')` and prefix the keys with `node.`.
- Update Storybook story files in the renamed pkg — no behavioral change, just import paths and stale `'nodes'` namespace references.
- Delete the dying pkg's stories.

**Out of scope**

- Per-node detail file renames (`*-tab.tsx → *-section.tsx`) and Storage data wiring. Lives in story 006.
- Replicas standalone app. Phase 2 (RFC 0029).

## Acceptance criteria

- [ ] `packages/features/ops/nodes/` no longer exists. `packages/features/ops/infrastructure/` is the merged pkg with `package.json:name = '@guepard/infrastructure'`.
- [ ] `grep -rn "@guepard/nodes" packages apps tooling` returns zero hits.
- [ ] `apps/web/src/lib/msw/handlers/replicas.ts` and `apps/web/src/lib/msw/fixtures/infrastructure.ts` keep their existing `import type … from '@guepard/infrastructure/types'` lines unchanged. They resolve correctly.
- [ ] `apps/web/src/lib/i18n/locales/en/nodes.json` no longer exists. `infrastructure.json` contains the merged `node.*` keys.
- [ ] `useTranslation('nodes')` returns zero hits across the repo.
- [ ] Cluster / provider / region tabs no longer reachable. `infrastructure-clusters-tab.tsx`, `infrastructure-providers-tab.tsx`, `infrastructure-overview-tab.tsx`, `cluster-card.tsx`, `cluster-details-sheet.tsx` are deleted.
- [ ] Replicas section still functions in `/infrastructure?view=settings` — add and remove a replica end-to-end.
- [ ] Topology + the merged Infrastructure read identical fleet numbers (both via `shell.fleet.summary`).
- [ ] `pnpm typecheck && pnpm test && pnpm --filter @guepard/infrastructure storybook` green.
- [ ] `hex-architecture-reviewer` agent passes — domain stays pure, no React-Query in domain, all `useShell()` access is via the runtime.

## Tasks

1. [001-carve-keep-files-from-dying-pkg](001-carve-keep-files-from-dying-pkg-pending.md)
2. [002-delete-dying-pkg](002-delete-dying-pkg-pending.md)
3. [003-rename-nodes-folder](003-rename-nodes-folder-pending.md)
4. [004-update-pkg-json-and-exports](004-update-pkg-json-and-exports-pending.md)
5. [005-rename-component-exports](005-rename-component-exports-pending.md)
6. [006-add-infrastructure-page-wrapper](006-add-infrastructure-page-wrapper-pending.md)
7. [007-merge-i18n-namespaces](007-merge-i18n-namespaces-pending.md)
8. [008-update-stories-and-cross-app-deps](008-update-stories-and-cross-app-deps-pending.md)

## Demo / verification

```
pnpm typecheck && pnpm test && pnpm build
pnpm dev
# /prj/<slug>/infrastructure → list view (today's nodes list).
# /prj/<slug>/infrastructure?view=activity → activity charts render.
# /prj/<slug>/infrastructure?view=settings → settings panel + replicas section side-by-side.
# Add a replica, remove it. No regression vs pre-refactor.
# /prj/<slug>/topology → fleet numbers match Infrastructure summary.
pnpm --filter @guepard/infrastructure storybook
```

## Questions surfaced

(none yet)
