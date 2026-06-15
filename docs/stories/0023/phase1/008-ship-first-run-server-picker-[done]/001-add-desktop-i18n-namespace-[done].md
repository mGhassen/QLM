---
story: ./story.md
status: done
layer: i18n
model: haiku
files:
  - apps/web/src/lib/i18n/locales/en/desktop.json
  - apps/web/src/lib/i18n/i18n.settings.ts
validation:
  kind: typecheck-only
---

# Add desktop i18n namespace

Create the `desktop` i18n namespace and register it so subsequent tasks can reference `t('desktop.firstRun.*')` keys.

## Done when

- [ ] New file `apps/web/src/lib/i18n/locales/en/desktop.json` with the keys from spec §11 (only the `firstRun` subset is in scope here — `settings.server`, `settings.llmKeys`, `errors` belong to stories 006/009 and can be added incrementally):
  ```json
  {
    "firstRun": {
      "title": "Choose a server",
      "subtitle": "Select where this app should connect.",
      "cloudOption": "Cloud (guepard.com)",
      "cloudDescription": "Connect to Guepard's hosted service.",
      "customOption": "Custom server URL",
      "customDescription": "Connect to your organization's deployment.",
      "urlPlaceholder": "https://guepard.your-company.com",
      "urlInvalid": "Enter a valid HTTPS URL.",
      "mdmBanner": "Your IT team configured this URL.",
      "continue": "Continue"
    }
  }
  ```
- [ ] `apps/web/src/lib/i18n/i18n.settings.ts` adds `'desktop'` to the `defaultI18nNamespaces` array (alphabetical-ish slot, e.g. between `datasources` and `integrations`).
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#11-i18n-key-map`. Story 006 (LLM keys) and 009 (server switcher) will extend this same `desktop.json` file with their own subtrees — keep the JSON structure compatible with that.
- This story is `en`-only per resolved decision #11. Other locales added when the project gains more languages.
