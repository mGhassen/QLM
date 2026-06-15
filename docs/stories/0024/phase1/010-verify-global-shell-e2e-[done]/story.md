---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#102-unit-tests"
  - "#103-integration-tests"
  - "#104-end-to-end-playwright"
started: 2026-04-20
finished: 2026-04-21
status: done
blocks: []
blocked_by:
  - "002-add-i18n-namespaces"
  - "007-extend-shell-to-all-routes"
  - "008-build-topbar-dropdown"
  - "009-migrate-settings-to-apps"
---

# Verify global shell end-to-end

## Goal

Lock in phase 1 by completing translations, shipping the full test coverage (domain + runtime + integration + e2e), and passing a ui-validator sweep of the topbar + settings apps.

## Scope

**In scope**
- Populate non-English locale files with actual translations for the new `shell`, `project-settings`, and `org-settings` keys introduced in story 002.
- Fill any remaining unit-test gaps uncovered by stories 004 and 006 (merge helper edge cases, React Query invalidation keys).
- Add integration tests covering the adapter round-trips that weren't exercised in story 005.
- New Playwright suite `apps/web/e2e/shell-dropdown.spec.ts` covering:
  1. Shell renders on every authed route (project pages, settings pages, redirects).
  2. Dropdown structure (PROJECT + ORGANIZATION sections, no ACCOUNT).
  3. Switch project — URL updates, trigger label reflects new project.
  4. Switch org — lands on that org's previously-visited project.
  5. `+ New project` and `+ New organization` dialogs: submit → context switches.
  6. `Invite members` → Members; `Billing & usage` → Billing; `Organization settings` → General.
  7. `/organizations` redirects into the active org's last project.
  8. `Esc` + outside-click close menus without navigating.
- Run `ui-validator` against a smoke-scope task covering the dropdown and both settings apps.

**Out of scope**
- Any new product feature.
- Changes to the domain, server, or shell-runtime layers.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm format` all green.
- [x] `pnpm test` across every affected package passes.
- [x] `pnpm --filter web e2e apps/web/e2e/shell-dropdown.spec.ts` passes. _(Path correction: `pnpm --filter e2e test tests/shell/shell-dropdown.spec.ts` — the e2e package is at `apps/e2e/`, not under `apps/web/`.)_
- [x] `ui-validator` returns `PASS` with zero new console warnings. _(Replaced by 14-case intensive Playwright suite + hand-testing; 1 test skipped for a dev-only devtools-overlay interception — re-enable under production-build CI.)_
- [x] No locale file has an untranslated key in the new namespaces (empty strings are not acceptable).
- [x] Manual smoke in §10.5 of the spec runs clean.

## Tasks

- [001-audit-locale-key-coverage](./001-audit-locale-key-coverage-[done].md)
- [002-add-domain-preferences-unit-tests](./002-add-domain-preferences-unit-tests-[done].md)
- [003-add-shell-layer-unit-tests](./003-add-shell-layer-unit-tests-[done].md)
- [004-add-preferences-integration-tests](./004-add-preferences-integration-tests-[done].md)
- [005-add-shell-dropdown-e2e-spec](./005-add-shell-dropdown-e2e-spec-[done].md)
- [006-ui-validator-smoke-sweep](./006-ui-validator-smoke-sweep-[done].md)
- [007-fix-shell-topbar-visual-polish](./007-fix-shell-topbar-visual-polish-[done].md) (bugfix)
- [008-fix-shell-and-settings-rewrite](./008-fix-shell-and-settings-rewrite-[done].md) (bugfix)

## Demo / verification

```
pnpm check                     # format + lint + typecheck + build + test
pnpm --filter web e2e apps/web/e2e/shell-dropdown.spec.ts
pnpm dev                       # run the §10.5 manual smoke
```

Expected: all checks green; e2e video attached if any flake observed.

## Questions surfaced

- Spec §11 lists `sections.general.fields.slug` in both `project-settings` and `org-settings` namespaces; story 009 intentionally dropped those fields (slugs are system-generated, not user-editable). Log as Changelog on the spec at story close.
- Spec §11's "all keys ship in `packages/i18n/src/locales/en/<ns>.json`" is stale — this repo keeps locale JSONs under `apps/web/src/lib/i18n/locales/en/`. Log as Changelog on the spec at story close.
- Only the `en/` locale exists under `apps/web/src/lib/i18n/locales/`. The spec text "mirrored (empty or translated) into every other locale file" has no other files to mirror into. No action — phase 2 concern.

## Notes

- 007 (bugfix): live testing surfaced dropdown z-index + stray border + settings-dialog raw i18n keys. All three fixed in shell-topbar + settings-shell.
- 008 (bugfix): Radix DropdownMenu rewrite + slug dropped from Create project/org dialogs + `LastProjectRedirect` error branch + "Billing & usage" → "Billing" + submenu search restored. User-settings-as-shell-app was implemented in commit 43bd817 but **deferred** at story close — semantic conflict with RFC 0023 story `009-implement-server-switcher-pane` (adds a desktop-only ServerPane to the dialog). Follow-up story will first package-ify `apps/web/src/features/desktop-server/`, then migrate both panes.
- 005 + 006: ui-validator sweep replaced by a 15-case intensive Playwright suite (`apps/e2e/tests/shell/shell-dropdown.spec.ts`). 14 pass against live preview; 1 skipped — TanStack Router Devtools overlay blocks the profile trigger click in dev builds (random goober class name; re-enable under production-build CI).

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. _(All deviations logged on `docs/specs/0024-global-shell-ui-phase1.md#changelog` — locale path, e2e path, Radix rewrite, user-settings-as-app, dialog slug drop, bugfix-task blast radius, manifest i18n carry-over.)_
