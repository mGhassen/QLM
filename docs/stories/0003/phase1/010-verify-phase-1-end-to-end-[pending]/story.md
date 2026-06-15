---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#10-verification-plan"
  - "#104-end-to-end-playwright"
  - "#105-manual-smoke"
status: pending
started: null
finished: null
blocks: []
blocked_by:
  - "009-compose-layer-2-with-fixture-transitions"
---

# Verify phase 1 end-to-end

## Goal

Polish the empty / loading / error states across every environments component, run the accessibility audit, hit the ≥80 % line coverage target on the feature package, ship the Playwright smoke spec, and walk the 19-step manual smoke checklist from spec §10.5 — so the phase is demonstrably complete.

## Scope

**In scope**

- **Empty / loading / error state polish** across every component shipped in Stories 005 – 009: tighten copy, match the POC visual reference, eliminate render flickers, confirm localisation coverage.
- **Accessibility audit**:
  - Tab order is logical through Layer 1 grid and Layer 2 graph.
  - Escape closes the inspector and returns focus to the previously selected graph node (or the body if none).
  - Every interactive element has a visible label or `aria-label`.
  - Focus-visible styles match `@guepard/ui` conventions.
  - Colour contrast on status chips passes WCAG AA against both `@guepard/ui` light and dark backgrounds.
  - Keyboard activation: Enter / Space on graph nodes selects them, Escape closes the inspector.
- **Unit-test coverage**: bring `packages/features/environments/src/` to ≥80 % line coverage. Fill gaps identified by the coverage run: branch chip overflow, inspector selection-swap branches, fixture-adapter timer edges, inspector Escape handler.
- **Playwright smoke**: `apps/e2e/tests/environments/layer-1-and-2.spec.ts` implementing the 14-step flow from spec §10.4. Runs against `pnpm web:dev` (no server, no Supabase running) because phase 1 is fixture-backed.
- **Manual smoke**: walk the 19 steps in spec §10.5 end-to-end. Log any deviations in the Questions surfaced section below; if the implementation deviates from the spec, file a `Changelog` line via `/finish-story`.
- **`pnpm check` green**: the repo-wide gate (`format:fix → format → lint → typecheck → build → test`) must pass from scratch.
- **Visual review**: open `pnpm --filter @guepard/environments storybook` side-by-side with the POC Storybook at `/Users/hani.chalouati/Documents/work/guepard/mock-v3/...` and confirm every ported component visually matches its counterpart (minus the deferred slots — masking panel, branch history panel, metric tiles, replication chips, lineage, context menus, infra footer, extra inspector tabs, ⌘K palette, env-tabs navbar).

**Out of scope** (forces honest slicing)

- Any new component (if visual polish reveals a missing component, stop and write a new story — do not sneak it into this one).
- Any new display type (if the types turn out wrong, stop and file a spec amendment — do not patch them silently here).
- Changes to the spec body — if the implementation deviates, `/finish-story` adds a `Changelog` line; the spec body stays frozen.
- Changes to the POC — the POC is read-only visual reference.

## Acceptance criteria

- [ ] Every environments component has clean empty / loading / error / ready states visible in Storybook, each localized.
- [ ] Keyboard a11y audit passes: tab order is logical, Escape closes the inspector and returns focus, every interactive element has a label, focus-visible styles are present, Space / Enter selects graph nodes.
- [ ] `pnpm --filter @guepard/environments test -- --coverage` reports ≥80 % line coverage on `packages/features/environments/src/`.
- [ ] `apps/e2e/tests/environments/layer-1-and-2.spec.ts` exists, runs locally against `pnpm web:dev`, and passes all 14 steps from spec §10.4.
- [ ] Manual smoke: all 19 steps from spec §10.5 walked; any deviations logged under "Questions surfaced".
- [ ] `pnpm check` passes end-to-end starting from a clean working tree.
- [ ] Visual review vs POC Storybook completed — every phase-1 component visually matches its POC counterpart for the subset the spec commits to.
- [ ] No new components or types were added (this story is verification-only).
- [ ] No TODOs or `// FIXME` comments remain in `packages/features/environments/` or `packages/apps/environments/`.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
# Full repo gate
pnpm check

# Coverage report
pnpm --filter @guepard/environments test -- --coverage

# Playwright smoke (requires pnpm web:dev running)
pnpm web:dev &
pnpm --filter @guepard/e2e test -- environments/layer-1-and-2
kill %1

# Manual smoke
pnpm web:dev
# Walk steps 1 – 19 from spec §10.5 in order; tick each one.

# Storybook visual review
pnpm --filter @guepard/environments storybook &
# Also run the POC Storybook for side-by-side comparison
cd /Users/hani.chalouati/Documents/work/guepard/mock-v3
pnpm --filter @workspace/environments storybook
```

## Questions surfaced

Log any deviations from the spec discovered during verification here. If non-empty, `/finish-story` adds a `Changelog` line to the spec.

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
