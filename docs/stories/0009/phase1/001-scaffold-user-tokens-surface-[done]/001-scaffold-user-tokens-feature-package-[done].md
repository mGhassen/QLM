---
story: ./story.md
status: done
layer: features
files:
  - packages/features/user-tokens/package.json
  - packages/features/user-tokens/tsconfig.json
  - packages/features/user-tokens/vitest.config.ts
  - packages/features/user-tokens/src/index.ts
  - packages/features/user-tokens/src/types/index.ts
  - packages/features/user-tokens/src/hooks/index.ts
  - packages/features/user-tokens/src/components/index.ts
---

# Scaffold user-tokens feature package

## Purpose

Create the empty `@guepard/user-tokens` workspace package with its public-export shape (`./types`, `./hooks`, `./components` subpaths) so Stories 002 / 008 / 009 can fill those directories without renegotiating the package boundary.

## Files

- `packages/features/user-tokens/package.json` — workspace manifest. Mirror `packages/features/datasources/package.json` for structure. Declare subpath exports:
  - `"."` → `./src/index.ts`
  - `"./types"` → `./src/types/index.ts`
  - `"./hooks"` → `./src/hooks/index.ts`
  - `"./components"` → `./src/components/index.ts`
  Dependencies: `@guepard/domain`, `@guepard/ui`, `@guepard/i18n`, `zod`. Peer deps: `react`, `react-dom`, `@tanstack/react-query`, `@tanstack/react-router`.
- `packages/features/user-tokens/tsconfig.json` — extend `@guepard/tsconfig` base (whichever config the repo's feature packages already use).
- `packages/features/user-tokens/vitest.config.ts` — Vitest + jsdom for React component tests, mirroring other feature packages.
- `packages/features/user-tokens/src/index.ts` — empty barrel; will re-export from `./types`, `./hooks`, `./components` once those land.
- `packages/features/user-tokens/src/types/index.ts` — empty barrel (Story 002 fills it).
- `packages/features/user-tokens/src/hooks/index.ts` — empty barrel (Story 008 fills it).
- `packages/features/user-tokens/src/components/index.ts` — empty barrel (Stories 009 / 010 / 011 fill it).

## Acceptance

- [ ] `pnpm install` recognizes `@guepard/user-tokens` as a workspace package (visible in `pnpm list -r | grep user-tokens`).
- [ ] `pnpm --filter @guepard/user-tokens typecheck` passes (empty barrels compile cleanly).
- [ ] `packages/features/user-tokens/package.json` declares the four subpath exports listed above.
- [ ] Importing `@guepard/user-tokens/types` from a scratch TS file resolves (to an empty module) without a resolution error.

## Test plan

```
pnpm install
pnpm --filter @guepard/user-tokens typecheck
# One-liner sanity check that subpath exports resolve:
node -e "require('@guepard/user-tokens/package.json'); console.log('ok')"
```

## Notes

- Reference `packages/features/datasources/package.json` (or another feature package) for the exact dependency catalog versions — do not pin fresh versions.
- Empty `index.ts` files containing only `export {};` avoid TS "is not a module" warnings while leaving the barrel fill for later stories.
- Do not add `tokens` i18n import resolution here — that comes in Story 003.
