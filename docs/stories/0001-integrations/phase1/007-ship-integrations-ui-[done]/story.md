---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#78-presentational-ui-package-packagesfeaturesintegrations--new-package-built-and-validated-first"
  - "#79-plugin-app-packagesappsintegrations--new-package-built-after-the-features-package"
  - "#79-i18n-packagesi18n"
  - "#710-feature-flag-optional-recommended"
  - "#11-i18n-key-map-phase-1-non-exhaustive-but-complete-enough-for-implementation"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-model-integration-domain
  - 006-expose-shell-runtime-resource
---

# Ship integrations UI

## Goal

Deliver the full phase-1 integrations user surface: the pure-presentation `features/integrations` package validated first in Storybook, then the `apps/integrations` plugin app that wires `useShell()` + React Query on top, plus the `integrations` i18n namespace and the `VITE_FEATURE_INTEGRATIONS` feature flag.

## Scope

**In scope**
- New package `packages/features/integrations` with components + Storybook stories + fixtures, validated under the stage-A review gate before any backend code ships
- `IntegrationsUI` built on top of `EntityListPage` from `@guepard/ui/entity-list` (search / sort / grid-vs-table toggle) — see spec Changelog for the design-review deviation from §3.2
- Three-column `ProviderPicker` with a disabled "More providers coming soon" card — see spec Changelog
- `IntegrationDetailSummary` accepting `createdByName?: string | null` — see spec Changelog
- New plugin app `packages/apps/integrations` — manifest + plugin-root wiring mutations through `shell.integrations.*` with cache invalidation + toasts
- Full `integrations` i18n namespace in `apps/web/src/lib/i18n/locales/en/integrations.json` and mirrored Storybook catalog in `packages/features/integrations/src/lib/story-helpers.tsx`
- `VITE_FEATURE_INTEGRATIONS` feature flag (defaults off in prod), read by the plugin manifest's `enabled` field

**Out of scope**
- Contextual help panels → [RFC 0005](../../../../rfcs/0005-contextual-help-panels.md) and its own story
- Manual sandbox smoke → deferred, tracked in spec §10.5

## Acceptance criteria

- [x] Every component in spec §3.2 has a Storybook story rendering from fixtures
- [x] Stage-A review gate cleared (user walked the story matrix before any backend code shipped)
- [x] `pnpm --filter @guepard/features-integrations test` green
- [x] `pnpm --filter @guepard/features-integrations typecheck` + `pnpm --filter @guepard/integrations typecheck` + `pnpm --filter web typecheck` all green on top of the pre-existing baseline
- [x] `integrations.json` locale covers every `list / new / form / detail / test / regions / rotate / rename / delete / toast / perm / provider` key group
- [x] With `VITE_FEATURE_INTEGRATIONS=false`, the plugin manifest reports `enabled: false` and the app is hidden from the sidebar + server routes return 404

## Tasks

Shipped files:

**Feature package (`packages/features/integrations`)**
- `package.json` + `tsconfig.json` + `eslint.config.mjs` scaffolding
- `src/index.ts` — barrel
- `src/components/integrations-ui.tsx` — rewritten on `EntityListPage`
- `src/components/integration-card.tsx` + `integrations-grid.tsx` (grid mode)
- `src/components/integration-detail-summary.tsx` — accepts `createdByName?: string | null`
- `src/components/provider-picker.tsx` — 3-column with "Coming soon" placeholder
- `src/components/aws-credentials-form.tsx` + `gcp-credentials-form.tsx` + `new-integration-view.tsx`
- `src/components/integration-detail-view.tsx` + `regions-panel.tsx` + `test-status-badge.tsx`
- `src/components/rotate-credentials-dialog.tsx` + `rename-integration-dialog.tsx` + `delete-integration-dialog.tsx`
- `src/lib/format-time-ago.ts` — native `Intl.RelativeTimeFormat` helper
- `src/lib/story-helpers.tsx` — i18next decorator + inline `integrationsEn` catalog
- `src/__fixtures__/integration-connections.fixture.ts` + `regions.fixture.ts`
- `src/**/*.stories.tsx` — 35 stories across components
- `src/**/*.test.tsx` — component tests for forms

**Plugin app (`packages/apps/integrations`)**
- `package.json`
- `src/manifest.ts` — `PluginManifest` with `routeBase: 'integrations'`, `projectTopLevelAppBucketId: 'ops'`, `enabled: isFeatureEnabled()`
- `src/plugin-root.tsx` — list / new / detail view state, dialogs, React Query mutations wired to `shell.integrations.*`
- `src/index.ts` — barrel

**i18n**
- `apps/web/src/lib/i18n/locales/en/integrations.json` — full namespace
- `apps/web/src/lib/i18n/i18n.settings.ts` — added `'integrations'` to `defaultI18nNamespaces`

**Feature flag**
- `apps/web/src/lib/feature-flags.ts` — `isFeatureEnabled('integrations')` reading `VITE_FEATURE_INTEGRATIONS`
- `apps/web/.env.local.example` — documented the new flag
- `apps/server/src/routes/integrations.ts` — feature-flag guard (story 005 already shipped the guard; listed here for completeness)

## Demo / verification

```bash
pnpm --filter @guepard/features-integrations test
pnpm --filter @guepard/features-integrations storybook
pnpm --filter web dev  # with VITE_FEATURE_INTEGRATIONS=true
```

In Storybook: every story under `Features/Integrations/*` renders correctly. In dev: the Integrations app appears in the project sidebar under Ops, creating an AWS integration succeeds end-to-end, the detail view shows the resolved creator name, and regions list.

## Questions surfaced

- Design-review feedback pushed several deviations from the spec's §3.2 visual sketches — all four are logged in the spec `## Changelog`. None changed the data flow.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped — with the four visual deviations recorded in the spec `## Changelog`.

Spec accurate: **no** — four visual/UX deviations, all recorded in the spec Changelog. Data contracts, ports, and DTOs are unchanged.
