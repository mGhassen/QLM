---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/settings-shell/package.json
  - packages/features/settings-shell/tsconfig.json
  - packages/features/settings-shell/vitest.config.ts
  - packages/features/settings-shell/src/index.ts
  - packages/features/settings-shell/src/components/index.ts
  - packages/features/settings-shell/src/types/index.ts
  - packages/features/settings-shell/__tests__/setup.ts
---

# Scaffold @qlm/settings-shell package

## Purpose

New workspace package home for the dialog + sidebar components task 002 will write. Mirrors the user-tokens package layout so subsequent stories know where to add things.

## Files

- `packages/features/settings-shell/package.json` — name `@qlm/settings-shell`, private, type module. Subpath exports `.`, `./components`, `./types`. Deps: `@qlm/domain` (workspace), `@qlm/ui` (workspace), `react` (catalog), `react-i18next`, `zod` (catalog), plus storybook + testing devDeps mirroring `@qlm/user-tokens`.
- `packages/features/settings-shell/tsconfig.json` — extends `@qlm/tsconfig/base.json`; includes `src` + `__tests__` + `vitest.config.ts`.
- `packages/features/settings-shell/vitest.config.ts` — jsdom env, istanbul coverage, `@testing-library/jest-dom/vitest` setup.
- `packages/features/settings-shell/src/index.ts` — `export {};` placeholder (re-exports added in task 002).
- `packages/features/settings-shell/src/components/index.ts` — `export {};`.
- `packages/features/settings-shell/src/types/index.ts` — `export {};`.
- `packages/features/settings-shell/__tests__/setup.ts` — `import '@testing-library/jest-dom/vitest';`.

## Acceptance

- [ ] `pnpm install` from repo root succeeds with the new package.
- [ ] `pnpm --filter @qlm/settings-shell typecheck` passes on the empty package.
- [ ] No new lockfile churn beyond the new package's deps.

## Test plan

```
pnpm install
pnpm --filter @qlm/settings-shell typecheck
```

## Storybook validation

N/A — empty scaffold; visual surface lands in task 002.

## Notes

- Mirror `packages/features/user-tokens/package.json` for the deps + scripts shape — same vitest + storybook setup.
- Task 002 adds `lucide-react`, `clsx`, `tailwind-merge` if components need them; task 001 keeps deps minimal.
