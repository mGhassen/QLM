---
spec: docs/specs/0025-ops-compute-refactor-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#75-presentation--feature-packages"
status: pending
started: null
finished: null
blocks: []
blocked_by: ["005-infrastructure-pkg-rename"]
---

# Rename per-node detail tabs to sections + wire Storage data

## Goal

Confirm per-node detail page renders Services / Storage / CPU / Memory as stacked sections (file rename hygiene) and replace the Storage section's empty state with real `node.diskGb` + `node.diskUtilPct` data.

## Scope

**In scope**

- File rename (use `git mv`) inside the merged `packages/features/ops/infrastructure/`:
  - `node-detail-cpu-tab.tsx` → `node-detail-cpu-section.tsx` (export `NodeDetailCpuSection`)
  - `node-detail-memory-tab.tsx` → `node-detail-memory-section.tsx` (export `NodeDetailMemorySection`)
  - `node-detail-services-tab.tsx` → `node-detail-services-section.tsx` (export `NodeDetailServicesSection`)
  - `node-detail-storage-tab.tsx` → `node-detail-storage-section.tsx` (export `NodeDetailStorageSection`)
- Update imports in `node-detail-page.tsx` and `presentation/components/index.ts`.
- Add optional `diskGb?: number`, `diskUtilPct?: number` to `packages/domain/src/entities/node.type.ts:NodeSchema`.
- Update `packages/repositories/supabase/src/node.repository.ts` to read `disk_gb` and join `node_runtime_state.disk_util_pct`. Run `pnpm supabase:web:typegen`.
- Replace empty state in `node-detail-storage-section.tsx` with `ResourceCard`-style readout consuming `node.diskGb` + `node.diskUtilPct` (mirror `node-detail-cpu-section.tsx`).
- Add new i18n keys to `apps/web/src/lib/i18n/locales/en/infrastructure.json` under `infrastructure.node.detail.storage.{utilization,specs,totalDisk}`. Drop `*.storage.empty.*`.
- Add Storybook stories for all four renamed sections.

**Out of scope**

- Workload (Service) domain port. Phase 2.
- Services section data. Stays empty for phase 1.
- DB migration adding new columns. The columns already exist (`disk_gb` on `public.node`, `disk_util_pct` on `public.node_runtime_state`).

## Acceptance criteria

- [ ] Four files renamed; imports updated; old filenames deleted.
- [ ] `node.diskGb` and `node.diskUtilPct` are present on the `Node` type after `pnpm supabase:web:typegen`.
- [ ] `node-detail-storage-section.tsx` shows real disk numbers when `node.diskGb` is defined.
- [ ] When `node.diskGb` is undefined (legacy fixture), section shows a graceful fallback (`—`) — does not throw.
- [ ] Each renamed section ships a Storybook story (`*.stories.tsx`).
- [ ] `pnpm typecheck && pnpm test && pnpm --filter @guepard/infrastructure storybook` green.

## Tasks

1. [001-rename-section-files](001-rename-section-files-pending.md)
2. [002-extend-node-domain-with-disk](002-extend-node-domain-with-disk-pending.md)
3. [003-update-node-supabase-adapter](003-update-node-supabase-adapter-pending.md)
4. [004-wire-storage-section-data](004-wire-storage-section-data-pending.md)
5. [005-add-storage-i18n-keys](005-add-storage-i18n-keys-pending.md)
6. [006-add-section-storybook-stories](006-add-section-storybook-stories-pending.md)

## Demo / verification

```
pnpm supabase:web:typegen
pnpm typecheck
pnpm dev
# Open /node/<nodeId> for any node in the fixtures.
# Observe CPU → Memory → Services → Storage stacked sections.
# Storage section shows disk capacity + utilization, not the empty state.
pnpm --filter @guepard/infrastructure storybook
```

## Questions surfaced

(none yet)
