---
story: ./story.md
status: done
layer: i18n
model: haiku
files:
  - apps/web/src/lib/i18n/locales/en/shell.json
  - apps/web/src/lib/i18n/locales/en/project-settings.json
  - apps/web/src/lib/i18n/locales/en/org-settings.json
validation:
  kind: typecheck-only
---

# Audit locale key coverage against spec §11

Ensure every key listed in `docs/specs/0024-global-shell-ui-phase1.md` §11 i18n key map is present in the three English locale files. Fill any gaps discovered by the audit.

## Done when

- [ ] `shell.json` contains every key under spec §11 Namespace `shell`.
- [ ] `project-settings.json` contains every key under spec §11 Namespace `project-settings`.
- [ ] `org-settings.json` contains every key under spec §11 Namespace `org-settings`.
- [ ] No key holds an empty string.
- [ ] `pnpm typecheck` green (no consumer uses a newly-missing key).

## Notes

- Only `en/` exists in `apps/web/src/lib/i18n/locales/` — no mirror to other locales needed. Flag this in story Questions surfaced.
- Spec §11's "all keys ship in `packages/i18n/src/locales/en/<ns>.json`" is stale — this repo keeps them under `apps/web/src/lib/i18n/locales/en/`. Log as a spec Changelog at story close.
