---
story: ./story.md
status: done
layer: i18n
model: haiku
files:
  - apps/web/src/lib/i18n/locales/en/shell.json
  - apps/web/src/lib/i18n/locales/en/project-settings.json
  - apps/web/src/lib/i18n/locales/en/org-settings.json
  - apps/web/src/lib/i18n/i18n.settings.ts
validation:
  kind: typecheck-only
---

# Add shell i18n namespaces

Ship three new English locale JSON files (`shell`, `project-settings`, `org-settings`) and register them in `defaultI18nNamespaces` so stories 008 and 009 can consume `t('shell.…')`, `t('project-settings.…')`, and `t('org-settings.…')` keys directly.

## Done when

- [x] `apps/web/src/lib/i18n/locales/en/shell.json` contains every `shell` namespace key listed in spec §11 (topbar trigger aria, dropdown section/shortcut labels, submenu placeholders/new rows, role badges, create-dialog labels/errors, generic errors).
- [x] `apps/web/src/lib/i18n/locales/en/project-settings.json` contains every `project-settings` namespace key (app title, General section title + field labels + save/saved/error).
- [x] `apps/web/src/lib/i18n/locales/en/org-settings.json` contains every `org-settings` namespace key (app title, General + Members + Billing + Usage section titles, General field labels + save states).
- [x] `defaultI18nNamespaces` in `apps/web/src/lib/i18n/i18n.settings.ts` includes `'shell'`, `'project-settings'`, `'org-settings'`.
- [x] Monorepo-wide `pnpm typecheck` stays green (49/49).

## Notes

- Codebase deviation from story text: locales live under `apps/web/src/lib/i18n/locales/<lang>/`, not `packages/i18n/src/locales/`. Only `en` is a supported language today — no other locales to mirror into.
- Flat key shape follows the spec's dot notation (e.g. `dropdown.shortcut.projectSettings`). Nest the JSON accordingly so `t('shell.dropdown.shortcut.projectSettings')` resolves.
- `haiku` model fits this task: it is purely mechanical JSON + one array append.
