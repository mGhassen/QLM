---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/shell-topbar/**
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Scaffold shell-topbar feature package

Create an empty `packages/features/shell-topbar` package with barrel exports, tsconfig, eslint config, vitest config, and a Storybook scaffold mirroring `packages/features/accounts`. No real components yet — later stories fill in the trigger, dropdown, submenus, and dialogs.

## Done when

- [ ] `packages/features/shell-topbar/package.json` declares name `@guepard/shell-topbar` and the usual workspace fields.
- [ ] `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, and Storybook config exist and mirror `packages/features/accounts`.
- [ ] `src/index.ts` re-exports at least one placeholder component.
- [ ] `pnpm --filter @guepard/shell-topbar typecheck` passes.
- [ ] Monorepo-wide `pnpm typecheck` stays green.

## Notes

- Mirror `packages/features/accounts` structure exactly; it's the canonical template for feature packages with Storybook.
- Storybook scaffold needs at least one story (even if empty) so `pnpm --filter @guepard/shell-topbar storybook` launches.
