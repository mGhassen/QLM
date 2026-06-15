---
story: ./story.md
status: done
layer: i18n
model: haiku
files:
  - apps/web/src/lib/i18n/locales/en/desktop.json
validation:
  kind: typecheck-only
---

# Add server-pane i18n keys

Add the `settings.server.*` block (and the `errors.tlsFailed` key referenced by the change-server flow) from spec §11 to the desktop.json locale file. The desktop SPA imports the same file via the `@/*` alias (which maps to `apps/web/src/*`), so a single edit covers both runtimes.

## Done when

- [ ] `apps/web/src/lib/i18n/locales/en/desktop.json` gains a `settings.server` object with these exact keys (values per spec §11):
  - `title`, `currentLabel`, `mdmBadge`, `changeAction`, `changeWarningTitle`, `changeWarningBody`, `changeWarningConfirm`, `changeWarningCancel`, `newUrlLabel`, `tlsInsecureBanner`.
- [ ] Same `settings.server` block under the same `settings.` namespace mirrored into `apps/desktop/src/lib/i18n/locales/en/desktop.json`.
- [ ] `errors.tlsFailed` added (copy: `"Could not establish a secure connection to {{url}}."`) to both files. The other `errors.*` keys from spec §11 stay deferred — the consumers ship in 010 / 006.
- [ ] No code references yet — task 003 wires `t('desktop.settings.server.*')` into the new component.
- [ ] `pnpm typecheck` green (no JSON parse failures in the i18n loaders).

## Notes

- Don't add the `settings.llmKeys` block — that's story 006's territory.
- Spec anchor: `#11-i18n-key-map`.
