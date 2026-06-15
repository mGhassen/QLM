---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
  - "#12-implementation-sequencing"
status: pending
started: null
finished: null
blocks:
  - "006-render-layer-1-catalogue"
blocked_by:
  - "002-define-display-types-and-fixtures"
  - "003-seed-environments-i18n-namespace"
---

# Build shared primitives and source card

## Goal

Ship the shared primitives (`StatusChip`, `ConnectionStringField`, `InlineError`, `EmptySlot`) and the `SourceCard` component with Storybook stories covering every state so the Layer 1 catalogue in Story 006 can compose them directly.

## Scope

**In scope**

- `src/components/primitives/status-chip.tsx` + `status-chip.stories.tsx` + `status-chip.test.tsx`
  - One story per `SourceStatus` value (`online`, `offline`, `registered`, `ingesting`, `healthy`, `failed`).
  - Color mapping matches spec §1 row 6: `online`/`healthy` green, `ingesting` amber with pulse, `failed` red, `offline`/`registered` grey. Uses Tailwind tokens (`text-green-500`, `text-amber-500`, `text-red-500`, `text-zinc-500`) — **not** hardcoded hex.
  - Label text comes from `environments.status.*` i18n keys (Story 003).
- `src/components/primitives/connection-string-field.tsx` + stories + tests
  - Masked rendering: password segment replaced with `••••••••` via a client-side regex.
  - Copy-to-clipboard button; `environments.actions.copy.tooltip` on hover, `environments.actions.copy.copied` flash on success.
  - **Copy button copies the masked value, never the raw one** (unit test confirms).
- `src/components/primitives/inline-error.tsx` + stories
  - Generic error message + retry button. `environments.errors.*` keys.
- `src/components/primitives/empty-slot.tsx` + stories
  - Reserved-but-unfed slot component used by the inspector (hidden entirely when there is no content — see spec §1 row 5).
- `src/components/source-card.tsx` + `source-card.stories.tsx` + `source-card.test.tsx`
  - Props: `source: SourceCard`, `onClick`, `onExpand`, `selected`.
  - Anatomy: provider icon + name, status dot + status label, optional volume stripe, optional default-branch stripe. Hover border highlight + box shadow.
  - Stories: every `SourceStatus` variant, with/without volume, with/without branch, hover, selected.
- All components use `Readonly<Props>`, compose `@qlm/ui` primitives (`Card`, `Badge`, `Button`, `Tooltip`, `Skeleton`), use Tailwind tokens, go through `t(...)` or `<Trans>` for every user-facing string.
- Provider icon mapping: inline `<ProviderIcon provider={datasource_provider} />` component that maps known strings (`postgres`, `mysql`, `mongo`, `redis`) to a `lucide-react` icon or short SVG with a generic fallback. No emoji.

**Out of scope** (forces honest slicing)

- `Layer1View` composition (→ Story 006)
- Any graph components (→ Story 007)
- The contextual inspector (→ Story 008)
- The plugin-root wiring (→ Story 006)
- `NodePickerPopover` / `BranchNameDialog` (→ Story 008)

## Acceptance criteria

- [ ] Every primitive has a `.stories.tsx` with Loading / Empty / Ready / Error stories where applicable (one story per state per spec §1 row 7).
- [ ] `SourceCard` has a story for every `SourceStatus` value (6 stories) plus variants: with-volume, without-volume, with-branch, without-branch, hover, selected.
- [ ] `StatusChip` color mapping matches spec §1 row 6 — verified by a story with all 6 chips side-by-side and by a unit test asserting the Tailwind classes applied per status.
- [ ] `ConnectionStringField` masks password segments via regex; a unit test confirms `onCopy` receives the masked string.
- [ ] No hardcoded English strings in any new file (grep `>[A-Z][a-z]+ ` on JSX text nodes returns zero hits).
- [ ] All new components declare their props as `Readonly<...>`.
- [ ] `pnpm --filter @qlm/environments storybook` serves all new stories without errors or warnings.
- [ ] `pnpm --filter @qlm/environments test` passes with ≥80% line coverage on touched files.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
# Run Storybook and visually confirm
pnpm --filter @qlm/environments storybook
# Browse: Environments/Primitives/StatusChip (6 stories)
# Browse: Environments/Primitives/ConnectionStringField
# Browse: Environments/Primitives/InlineError
# Browse: Environments/SourceCard (all variants)

# Run tests
pnpm --filter @qlm/environments test
pnpm --filter @qlm/environments test -- --coverage
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
