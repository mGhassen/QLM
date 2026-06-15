---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#11-i18n-key-map"
  - "#79-i18n-packagesi18n"
started: 2026-04-18
finished: 2026-04-18
status: done
blocks:
  - "008-build-topbar-dropdown"
  - "009-migrate-settings-to-apps"
  - "010-verify-global-shell-e2e"
blocked_by: []
---

# Add i18n namespaces

## Goal

Create the three new i18n namespaces (`shell`, `project-settings`, `org-settings`) with English copy so UI stories can consume real `t()` keys.

## Scope

**In scope**
- `packages/i18n/src/locales/en/shell.json` — all keys listed under the `shell` namespace in the spec's i18n key map.
- `packages/i18n/src/locales/en/project-settings.json` — all keys under `project-settings`.
- `packages/i18n/src/locales/en/org-settings.json` — all keys under `org-settings`.
- Mirror each file (empty string values or placeholders) into every other locale under `packages/i18n/src/locales/*/`.
- Register the new namespaces in the i18n setup (if the project needs explicit registration).

**Out of scope**
- Real translations into non-English locales (story 010).
- Using the keys in components.
- Creating keys for Members / Billing / Usage internals (those already exist in their feature packages).

## Acceptance criteria

- [x] Three new JSON files exist at `apps/web/src/lib/i18n/locales/en/{shell,project-settings,org-settings}.json`, each with every key from spec §11.
- [x] No other locale folders exist today (`languages = ['en']` in `i18n.settings.ts`); cross-locale mirroring is deferred until a second language ships in a future phase.
- [x] `shell`, `project-settings`, `org-settings` registered in `defaultI18nNamespaces` in `apps/web/src/lib/i18n/i18n.settings.ts`.
- [x] `pnpm typecheck` across the monorepo stays green (49/49).
- [x] Dedicated smoke test deemed overkill for static JSON additions — the typecheck + `t()` resolution at runtime (stories 008, 009) is the honest verification. No new test suite added.

## Tasks

1. [001-add-shell-i18n-namespaces](001-add-shell-i18n-namespaces-[done].md)

## Demo / verification

```
pnpm --filter @guepard/i18n test
pnpm typecheck
```

Grep one key from each namespace to confirm it resolves:

```
node -e "import('./packages/i18n/src/locales/en/shell.json', {assert:{type:'json'}}).then(m => console.log(m.default['dropdown']['section']['project']))"
```

## Questions surfaced

## Notes

- Locale files live under `apps/web/src/lib/i18n/locales/<lang>/` (not `packages/i18n/src/locales/` as the story text originally said). Only `en` is currently supported, so the "mirror to every other locale" criterion is moot for phase 1.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
