---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#11-i18n-key-map"
  - "#77-i18n-packagesi18n--appswebsrclibi18n"
  - "#105-manual-smoke"
status: pending
started: null
finished: null
blocks: []
blocked_by: ["007", "008"]
---

# add-i18n-and-smoke

## Goal

Every user-facing string in the Predictions app routes through `t()` from the new `predictions` namespace, and the §10.5 manual smoke pass succeeds end-to-end.

## Scope

**In scope**
- `apps/web/src/lib/i18n/locales/en/predictions.json` — populated with the full key map from spec §11.
- `apps/web/src/lib/i18n/i18n.settings.ts` — append `'predictions'` to `defaultI18nNamespaces`.
- Sweep stories 002 / 007 / 008 outputs and replace every TODO-marked English literal with `t('predictions.<key>')` or `<Trans i18nKey="predictions.<key>" />` from `@guepard/ui/trans`.
- Finalize Storybook stories with translated strings (i18n initialized in storybook config or stubbed).
- Run §10.5 smoke locally and document the result in this story's `Demo / verification` outcome.

**Out of scope**
- Additional locales beyond `en`.
- Cross-project key reuse.

## Acceptance criteria

- [ ] `grep -nE '"[A-Z][a-z]+ [a-z]+"' packages/apps/predictions/src packages/features/predictions/src` returns no user-facing English literals (only test strings, comments, or whitelisted exceptions).
- [ ] ESLint passes — no `react-i18next/Trans` import (must be from `@guepard/ui/trans`).
- [ ] `apps/web/src/lib/i18n/i18n.settings.ts` lists `'predictions'` in `defaultI18nNamespaces`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` are green.
- [ ] Manual smoke per §10.5 succeeds: take a snapshot, drill into a table, ask the agent, get a coherent streamed reply.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm supabase:web:start && pnpm supabase:web:reset && pnpm supabase:web:typegen
pnpm dev
```

Then walk §10.5 step-by-step.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
