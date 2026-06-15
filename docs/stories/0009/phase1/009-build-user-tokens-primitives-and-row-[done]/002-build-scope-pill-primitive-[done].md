---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/primitives/scope-pill.tsx
  - packages/features/user-tokens/src/components/primitives/scope-pill.stories.tsx
  - packages/features/user-tokens/__tests__/scope-pill.test.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build ScopePill primitive

## Purpose

Inline scope pill rendered by `TokenRow` (one per scope, in `read / write / admin` order) and by the create-pane scope picker.

## Files

- `packages/features/user-tokens/src/components/primitives/scope-pill.tsx`:
  - `<ScopePill scope={UserTokenScope} />`. Color mapping: `read` → blue (`text-blue-600` / `bg-blue-500/10` / `border-blue-500/20`), `write` → amber (`text-amber-600` / `bg-amber-500/10` / `border-amber-500/20`), `admin` → purple (`text-purple-600` / `bg-purple-500/10` / `border-purple-500/20`).
  - Label via `t('tokens:scopes.<value>')`.
  - Compose `@qlm/ui/badge` with `variant="outline"`.
  - `Readonly<Props>`.
- `packages/features/user-tokens/src/components/primitives/scope-pill.stories.tsx`:
  - `meta.title = 'UserTokens/Primitives/ScopePill'`, decorator = `withUserTokensProviders`.
  - Stories: `Read`, `Write`, `Admin`, `AllThreeInOrder` (read+write+admin in a row, the canonical render order).
- `packages/features/user-tokens/__tests__/scope-pill.test.tsx`:
  - 3 cases: each scope renders correct label + colour class.
- `packages/features/user-tokens/src/components/index.ts` — extend re-exports with `ScopePill`.

## Acceptance

- [ ] `pnpm --filter @qlm/user-tokens typecheck` passes.
- [ ] `pnpm --filter @qlm/user-tokens test` passes.
- [ ] No hardcoded English strings.
- [ ] Tailwind tokens only.
- [ ] `Readonly<Props>` on the component.

## Test plan

```
pnpm --filter @qlm/user-tokens typecheck
pnpm --filter @qlm/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @qlm/storybook-config storybook`
- **Story titles to inspect**: `UserTokens / Primitives / ScopePill / Read`, `… / Write`, `… / Admin`, `… / All Three In Order`
- **Expected visual outcome**: three distinct pills — blue Read, amber Write, purple Admin. Labels match `tokens.scopes.*`.

## Notes

- Color mapping rationale: blue = "passive read," amber = "caution / writes," purple = "elevated / admin."
- Order convention `read / write / admin` matches the existing `UserTokenScopeSchema` enum order.
