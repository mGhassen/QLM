---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesuser-tokens"
  - "#321-usertokens--the-list-page"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "011-build-tokens-settings-pane-and-inline-sub-flows"
blocked_by:
  - "002-define-user-token-domain-types"
  - "003-seed-user-tokens-i18n-namespace"
---

# Build user-tokens primitives and row

## Goal

Ship the shared primitives (`StatusChip`, `ScopePill`, `FilterPopover`) and the `TokenRow` component with Storybook stories covering every state — the building blocks the Layer-1 list view composes in Story 010 and the dialogs compose in Story 011.

## Scope

**In scope**

- `packages/features/user-tokens/src/components/primitives/status-chip.tsx` + `status-chip.stories.tsx` + `status-chip.test.tsx`
  - Props: `status: UserTokenStatus` (from Story 002).
  - 3 variants (`active` / `expired` / `revoked`). Color mapping: active → green (`text-green-500` / `bg-green-500/10`), expired → grey, revoked → red. Tailwind tokens only — no hex.
  - Label text from `tokens.status.*` i18n keys.
  - Stories: one per status.
- `packages/features/user-tokens/src/components/primitives/scope-pill.tsx` + stories + tests
  - Props: `scope: UserTokenScope`.
  - 3 variants (`read` / `write` / `admin`) with distinct color coding matching the screenshots. Label from `tokens.scopes.*`.
  - Stories: one per scope.
- `packages/features/user-tokens/src/components/primitives/filter-popover.tsx` + stories + tests
  - Generic multi-select popover. Props: `label`, `options: Array<{ value: T; label: string }>`, `selected: T[]`, `onChange(next: T[])`.
  - Visual shell: a button showing `label` + badge count when selected, opens a popover with checkboxes.
  - Used by Story 010 for both status and scopes filters.
  - Stories: empty, some-selected.
- `packages/features/user-tokens/src/components/token-row.tsx` + stories + tests
  - Props: `token: UserToken`, `onRevokeClick(token: UserToken)`.
  - Renders the 7 columns exactly per spec §3.2.1: Name (`token.token_name`), Expires (localized date from `token.expires_at * 1000`), Status (`<StatusChip status={deriveUserTokenStatus(token)} />`), Created At (localized date), Revoked At (localized date or `tokens.table.notApplicable`), Scopes (one `<ScopePill />` per scope, always in the order `read / write / admin`), Actions (revoke icon button, disabled for non-active tokens, `aria-label={t('tokens.table.revokeAriaLabel')}`).
  - Stories: active + all 3 scopes, active + read only, expired, revoked, with various scope combos.
- All components: `Readonly<Props>`, compose `@guepard/ui` primitives (`Badge`, `Button`, `Popover`, `Checkbox`), Tailwind tokens, every string via `t(...)` or `<Trans>`.

**Out of scope**

- `TokenListView` page composition (→ Story 010).
- Dialogs (→ Story 011).
- Wiring to the real route / hooks (→ Story 010).

## Acceptance criteria

- [x] `StatusChip` color mapping ships as active=green, expired=muted, revoked=red. Verified by `AllThree` story (user-approved 2026-04-16) + 3 unit tests asserting Tailwind classes.
- [x] `ScopePill` ships distinct colours per scope: read=blue, write=amber, admin=purple. Visually verified via `AllThreeInOrder` story.
- [x] `FilterPopover` is generic over `T extends string` — verified by 5 tests including one parameterised over both `UserTokenStatus` and `UserTokenScope`.
- [x] `TokenRow` renders all 7 columns for active / expired / revoked. 6 unit tests + 5 stories (`ActiveAllScopes`, `ActiveReadOnly`, `ActiveWriteAndAdmin`, `Expired`, `Revoked`).
- [x] `TokenRow` revoke button is disabled for non-active statuses — verified by 2 unit tests AND visually in the `Expired` / `Revoked` stories (greyed trash icon).
- [x] No hardcoded English strings — labels resolved via `t('tokens:...')` / `t('settings:...')`.
- [x] All new components are typed with `Readonly<Props>`.
- [x] `pnpm --filter @guepard/user-tokens test` passes (25 tests, 100 % line on the three primitives, ~95 % on `token-row.tsx`).
- [x] Storybook stories render cleanly under `pnpm --filter @guepard/storybook-config storybook` — user-validated 2026-04-16.

## Tasks

1. [001-build-status-chip-primitive](001-build-status-chip-primitive-[pending].md) — features. `StatusChip` + shared `story-helpers.tsx` (i18n + decorator).
2. [002-build-scope-pill-primitive](002-build-scope-pill-primitive-[pending].md) — features. `ScopePill` (3 scope variants).
3. [003-build-filter-popover-primitive](003-build-filter-popover-primitive-[pending].md) — features. Generic multi-select popover for status + scopes filters.
4. [004-build-token-row-component](004-build-token-row-component-[pending].md) — features. 7-column row composing the three primitives + revoke button.

## Demo / verification

```bash
pnpm --filter @guepard/user-tokens storybook
# Browse: UserTokens/Primitives/StatusChip (3 stories)
# Browse: UserTokens/Primitives/ScopePill (3 stories)
# Browse: UserTokens/Primitives/FilterPopover (2 stories)
# Browse: UserTokens/TokenRow (multiple variants)

pnpm --filter @guepard/user-tokens test -- primitives
pnpm --filter @guepard/user-tokens test -- token-row
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. No deviations.
