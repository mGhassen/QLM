---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#321-layer-1--catalogue-layer1view"
  - "#33-user-flows-happy-paths"
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
  - "#76-shell-app-packagesappsenvironments"
  - "#78-host-app-appsweb"
status: pending
started: null
finished: null
blocks:
  - "009-compose-layer-2-with-fixture-transitions"
blocked_by:
  - "005-build-shared-primitives-and-source-card"
---

# Render layer 1 catalogue

## Goal

Ship `Layer1View` with Loading / Empty / Ready / Error states, wire the plugin-root default export via `useFixtureSources`, add the routing helper, and navigate to Layer 2 on card click — so `pnpm web:dev` opens on a fully interactive fixture catalogue.

## Scope

**In scope**

- `src/components/layer-1-view.tsx` + `layer-1-view.stories.tsx` + `layer-1-view.test.tsx`
  - Props: `{ sources: SourceCard[]; isLoading: boolean; error: Error | null; onSelectSource: (s: SourceCard) => void; onRetry: () => void; }` as `Readonly<Layer1ViewProps>`.
  - Layout: full-bleed dot-grid background (reusing `EnvironmentsCanvasDotGrid` from Story 007 if it lands first, or a placeholder until then — see note below), centered flex-wrap container with `max-w-5xl`, cards at 200px wide.
  - Empty state: centered illustration + `environments.layer1.empty.heading` + `environments.layer1.empty.body`. No primary action.
  - Loading state: six skeleton cards via `@guepard/ui/skeleton`.
  - Error state: `<InlineError />` (Story 005 primitive) with retry button.
  - Ready state: grid of `<SourceCard />` components, one click handler per card.
  - Stories: one per state.
- `packages/apps/environments/src/plugin-root.tsx` default export (`EnvironmentsPluginRoot`):
  - Calls `useFixtureSources(projectSlug)` from `@guepard/environments/fixtures`.
  - Passes `sources`, `isLoading`, `error`, `onSelectSource`, `onRetry` to `<Layer1View />`.
  - `onSelectSource` navigates to `/prj/$projectSlug/environments/$sourceSlug` via `useNavigate` from `@tanstack/react-router`.
- `apps/web/src/config/paths.config.ts`:
  - Add `createEnvironmentsPath(projectSlug: string)` helper (returns `/prj/${projectSlug}/environments`).
- `apps/web/package.json`: add `@guepard/environments` and `@guepard/apps-environments` to dependencies if they aren't already from Story 001.
- Unit test for the navigate callback with a mocked router.

**Out of scope** (forces honest slicing)

- `Layer2View` — clicking a card results in a 404 until Story 009 lands. That is expected.
- `FlatRoot` export (→ Story 009).
- `resolveProjectContext` export (→ Story 009).
- `createEnvironmentFlatPath` helper (→ Story 009).
- Any graph or inspector components (→ Stories 007 / 008).

**Note on `EnvironmentsCanvasDotGrid`**: Stories 006 and 007 can run in parallel after Story 002/003/005 land. If Story 007 has not delivered the dot-grid component yet, Layer 1 uses a temporary placeholder background and a `TODO(007)` comment, which Story 007 removes when it lands.

## Acceptance criteria

- [ ] `Layer1View` has four Storybook stories: Loading / Empty / Ready / Error.
- [ ] `useFixtureSources('any-slug')` returns the three fixture sources from Story 002 synchronously in the `Ready` state.
- [ ] Clicking a source card in the app calls `onSelectSource` with the corresponding `SourceCard`, which navigates to `/prj/{slug}/environments/{sourceSlug}` (verified by a unit test using `MemoryRouter` or equivalent + manual smoke).
- [ ] `createEnvironmentsPath` exists in `paths.config.ts` and is exported from the barrel.
- [ ] `pnpm web:dev` → navigate to `/prj/{any-slug}/environments` → render 3 fixture cards → click Postgres card → URL becomes `/prj/{slug}/environments/postgres-primary` (Layer 2 returns 404 until Story 009).
- [ ] Empty state is user-friendly and localized — verified by rendering the story with `sources={[]}`.
- [ ] No hardcoded English strings in the new files.
- [ ] `pnpm typecheck` passes across `@guepard/environments`, `@guepard/apps-environments`, `apps/web`.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
pnpm web:dev
# Browser:
# 1. Sign in, pick any project.
# 2. Click "Environments" in the project sidebar.
# 3. URL: /prj/{slug}/environments
# 4. See three fixture source cards: postgres-primary (online), redis-cache (online), mongo-docs (offline).
# 5. Click postgres-primary.
# 6. URL changes to /prj/{slug}/environments/postgres-primary.
# 7. Expect a 404 or blank Layer 2 — Story 009 delivers the Layer 2 view.

# Storybook visual review
pnpm --filter @guepard/environments storybook
# Browse: Environments/Layer1View (4 state stories)

# Tests
pnpm --filter @guepard/environments test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
