---
story: ./story.md
status: pending
layer: domain
files:
  - packages/auth-shared/package.json
  - packages/auth-shared/tsconfig.json
  - packages/auth-shared/vitest.config.ts
  - packages/auth-shared/src/index.ts
---

# Scaffold auth-shared package

## Purpose

Create an empty `@qlm/auth-shared` workspace package so task 002 has a home for the bearer-token module and its tests.

## Files

- `packages/auth-shared/package.json` — workspace package manifest; deps `zod` + `jsonwebtoken` + types; scripts for `test` / `typecheck` / `lint`; no framework deps.
- `packages/auth-shared/tsconfig.json` — extends `@qlm/tsconfig/base.json`; includes `src` + `__tests__`.
- `packages/auth-shared/vitest.config.ts` — node env, istanbul coverage, `src` alias; mirrors `packages/domain/vitest.config.ts`.
- `packages/auth-shared/src/index.ts` — empty barrel (re-export target for task 002); single `export {}` until task 002 populates it.

## Acceptance

- [ ] `pnpm install` from repo root succeeds with the new package present.
- [ ] `pnpm --filter @qlm/auth-shared typecheck` passes on the empty package.
- [ ] `package.json` declares no imports of Hono, Express, `@supabase/*`, React, or any framework-specific package.
- [ ] Package name is `@qlm/auth-shared` (spec §7.4 naming).

## Test plan

```
pnpm install
pnpm --filter @qlm/auth-shared typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- Mirror `packages/shell-contracts` for the minimal-package shape; copy test infra from `packages/domain`.
- Add `jsonwebtoken` and `@types/jsonwebtoken` as regular deps (not catalog if not present); `zod` uses the workspace catalog.
- No `.server.ts` suffix — this module is runtime-neutral.
