---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/primitives/status-chip.tsx
  - packages/features/user-tokens/src/components/primitives/status-chip.stories.tsx
  - packages/features/user-tokens/__tests__/status-chip.test.tsx
  - packages/features/user-tokens/src/components/story-helpers.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build StatusChip primitive

## Purpose

Inline status pill rendered by `TokenRow` (and reused later by the create-pane preview) that maps `UserTokenStatus` → coloured chip with the localized label.

## Files

- `packages/features/user-tokens/src/components/primitives/status-chip.tsx`:
  - `<StatusChip status={UserTokenStatus} />`. Color mapping: `active` → green (`text-green-600` / `bg-green-500/10` / `border-green-500/20`), `expired` → muted (`text-muted-foreground` / `bg-muted` / `border-border`), `revoked` → red (`text-red-600` / `bg-red-500/10` / `border-red-500/20`).
  - Label via `t('tokens:status.<value>')`.
  - Compose `@guepard/ui/badge` with `variant="outline"` + `cn(...)` to layer the colour classes.
  - `Readonly<Props>`.
- `packages/features/user-tokens/src/components/story-helpers.tsx` — shared decorator + i18n init for all user-tokens stories. Mirrors `packages/features/auth/src/components/story-helpers.tsx`. Loads inline translations for `tokens.*` and `settings.*` namespaces (from `apps/web/src/lib/i18n/locales/en/{tokens,settings}.json`). Exports `withUserTokensProviders` decorator.
- `packages/features/user-tokens/src/components/primitives/status-chip.stories.tsx`:
  - `meta.title = 'UserTokens/Primitives/StatusChip'`, decorator = `withUserTokensProviders`.
  - Stories: `Active`, `Expired`, `Revoked`, `AllThree` (renders the three side-by-side for visual comparison).
- `packages/features/user-tokens/__tests__/status-chip.test.tsx`:
  - 3 cases: each status renders the correct label AND the expected colour class on the badge.
- `packages/features/user-tokens/src/components/index.ts` — re-export `StatusChip`.

## Acceptance

- [ ] `pnpm --filter @guepard/user-tokens typecheck` passes.
- [ ] `pnpm --filter @guepard/user-tokens test` passes (new tests included).
- [ ] No hardcoded English strings in `status-chip.tsx`.
- [ ] All chip colours come from Tailwind tokens — no hex.
- [ ] `Readonly<Props>` on the component.

## Test plan

```
pnpm --filter @guepard/user-tokens typecheck
pnpm --filter @guepard/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @guepard/storybook-config storybook`
- **Story titles to inspect**: `UserTokens / Primitives / StatusChip / Active`, `… / Expired`, `… / Revoked`, `… / All Three`
- **Expected visual outcome**: three pills in a row — green ✓Active, muted ⏰Expired, red ⛔Revoked. Labels read from i18n exactly as in `tokens.status.*`.

## Notes

- Storybook lives at `tooling/storybook` and globs `packages/features/**/*.stories.@(...)` — no per-package storybook setup needed.
- `story-helpers.tsx` is shared by every story file in the package; subsequent tasks add to its translation map rather than re-init.
- Color mapping rationale: green = "all good," muted = "no action available," red = "revoked / blocked."
