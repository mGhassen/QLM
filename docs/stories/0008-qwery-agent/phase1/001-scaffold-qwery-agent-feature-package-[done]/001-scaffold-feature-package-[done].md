---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/package.json
  - packages/features/qwery-agent/tsconfig.json
  - packages/features/qwery-agent/src/index.ts
---

# Scaffold feature package

## Purpose

Create the new `@guepard/qwery-agent` workspace package with standard tooling config so subsequent tasks have a place to add components.

## Files

- `packages/features/qwery-agent/package.json` — package manifest mirroring `packages/features/notebook/package.json`; `name: "@guepard/qwery-agent"`, private, exports map, workspace:* devDeps.
- `packages/features/qwery-agent/tsconfig.json` — extends the shared React tsconfig used by sibling feature packages.
- `packages/features/qwery-agent/src/index.ts` — empty module (`export {};`) placeholder, filled by later tasks.

## Acceptance

- [x] `pnpm install` completes without workspace errors; the new package is picked up by the existing `packages/features/*` glob.
- [x] `pnpm --filter @guepard/qwery-agent typecheck` passes (no files → no errors).
- [x] No changes to unrelated packages' lockfiles beyond what adding the new workspace requires.

## Test plan

```
pnpm install
pnpm --filter @guepard/qwery-agent typecheck
```

## Notes

- Copy the exact shape of `packages/features/notebook/package.json` then trim deps to the minimum needed (no codemirror/dnd-kit/etc).
- Do NOT add `@tanstack/react-query` yet — story 005 adds it when wiring live data.
- Do NOT edit `pnpm-workspace.yaml` unless the glob doesn't already include `packages/features/*`.
