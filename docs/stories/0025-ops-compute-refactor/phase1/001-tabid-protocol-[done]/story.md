---
spec: docs/specs/0025-ops-compute-refactor-phase1.md
spec_sections:
  - "#13"
  - "#54-tabid-protocol"
  - "#78-shell-contracts-packagesshell-contracts"
status: pending
started: null
finished: null
blocks: ["005-infrastructure-pkg-rename"]
blocked_by: []
---

# Add typed TabId protocol in shell-contracts

## Goal

Replace inline `tid:` string parsing across routes and emitters with a Zod-discriminated `TabId` union owned by `@guepard/shell-contracts`, with backwards-compat for legacy `nc:` / `np:` / `topology:*` URLs.

## Scope

**In scope**

- Add `packages/shell-contracts/src/tab-id.ts` with `TabIdSchema`, `encodeTabId`, `decodeTabId`, `deriveTabTitle`.
- Add `zod` as a runtime dep on `@guepard/shell-contracts` (currently dep-free).
- Add round-trip tests for every variant + every legacy form.
- Replace inline parsing in `apps/web/src/routes/prj/$projectSlug/$routeBase.tsx`.
- Replace string emission in topology pkg, infrastructure (dying) pkg, nodes pkg — every `tid: ...` construction site.
- Drop every `as never` cast on the affected `navigate({to, search})` calls.
- Add `shell.tab.provider.{aws,gcp,azure,on-premise}`, `shell.tab.attention`, `shell.tab.unclustered` to `apps/web/src/lib/i18n/locales/en/shell.json`.

**Out of scope** (forces honest slicing)

- Deleting the legacy `nc:` / `np:` / `topology:*` parsing branch. Phase 2 deletes after analytics confirm zero live URLs.
- The `Pool` domain entity. Lives in story 003.
- Any pkg rename. Lives in story 005.

## Acceptance criteria

- [ ] `packages/shell-contracts/src/tab-id.ts` exports `TabIdSchema`, `TabId`, `encodeTabId`, `decodeTabId`, `deriveTabTitle`.
- [ ] `packages/shell-contracts/src/tab-id.test.ts` covers encode/decode round-trip for all six variants + the four legacy prefix forms (`nc:`, `np:`, `topology:`, `node:`).
- [ ] `apps/web/src/routes/prj/$projectSlug/$routeBase.tsx` no longer has any `tid.startsWith(...)` branches; uses `decodeTabId` + `deriveTabTitle`.
- [ ] `grep -rn "tid: \`topology:\|tid: \`nc:\|tid: \`np:\|tid: \`node:" packages apps` returns zero hits.
- [ ] `grep -rn "as never" packages/features/ops packages/apps` returns zero hits in any `navigate({to, search})` block.
- [ ] `pnpm typecheck` green; `pnpm test` green; `pnpm --filter @guepard/shell-contracts test` covers the new tests.
- [ ] Bookmarked URL `?tid=topology:aws:us-east-1:default` still produces a virtual tab with the same title as the canonical form `?tid=topology-pool:aws:us-east-1:default`.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-add-tabid-schema-and-helpers](001-add-tabid-schema-and-helpers-pending.md)
2. [002-replace-route-host-parser](002-replace-route-host-parser-pending.md)
3. [003-rewrite-emitters](003-rewrite-emitters-pending.md)
4. [004-add-i18n-keys](004-add-i18n-keys-pending.md)

## Demo / verification

```
pnpm typecheck
pnpm --filter @guepard/shell-contracts test
pnpm dev
# Open http://localhost:3000/prj/<slug>/topology
# Click any pool card → "Drill into" → URL contains tid=topology-pool:...
# Reload browser. Title in tab bar matches the localized provider/region/cluster string.
# Manually set the URL to ?tid=topology:aws:us-east-1:default (legacy form). Title still resolves.
```

## Questions surfaced

(none yet)
