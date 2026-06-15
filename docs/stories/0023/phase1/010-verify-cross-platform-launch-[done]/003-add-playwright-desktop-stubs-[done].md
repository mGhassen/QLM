---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/e2e/tests/desktop/desktop-runtime-gates.spec.ts
validation:
  kind: typecheck-only
---

# Add Playwright desktop stubs

Per spec §10.4: real Tauri WebDriver e2e is deferred; for phase 1, add Playwright tests that stub `window.__TAURI__` + `window.__QLM_API_URL` so the runtime-gated routes render in a normal browser.

Correction from plan: `apps/web/e2e/` doesn't exist — the monorepo's Playwright suite lives at `apps/e2e/`. Using that.

## Done when

- [ ] `apps/e2e/tests/desktop/desktop-runtime-gates.spec.ts` (new) with one spec:
  - `first-run picker renders under desktop runtime`: `page.addInitScript` injects `window.__TAURI__ = {}` + `window.__QLM_API_URL = 'http://127.0.0.1:3999'` before navigation. Navigate to `/desktop/first-run`. Assert the picker's three options (Cloud / Custom / Local) render + a `Continue` button is visible.
- [ ] The Server-pane assertion from the original plan is **deferred** — opening the Settings dialog requires a signed-in session + the existing auth fixture, which adds significant scope (dependency on the Mailpit flow + email confirmation). Story 012 already verified the Server pane visually; adding the Playwright assertion is noise here. Note the deferral in story Notes.
- [ ] LLM keys assertion **excluded** (story 006 moved to RFC 0026).
- [ ] Uses `apps/e2e`'s existing `playwright.config.ts` — no new config file.
- [ ] `pnpm typecheck` green. (Full Playwright run is a manual gate the user triggers with `pnpm --filter e2e test`; infrastructure is not auto-invoked here.)

## Notes

- `page.addInitScript` runs before any page script — not `page.evaluate`.
- `isDesktopApp()` from `@qlm/shared/desktop` just checks `typeof window.__TAURI__ !== 'undefined'`; no methods need to be populated.
- Spec anchor: `#104-end-to-end-playwright`.
