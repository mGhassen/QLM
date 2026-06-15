---
story: ./story.md
status: pending
layer: tests
files:
  - apps/e2e/tests/user-tokens/create-reveal-revoke.spec.ts
  - apps/e2e/tests/user-tokens/user-tokens.po.ts
---

# Write Playwright e2e create-reveal-revoke spec

## Purpose

Adapt the 13-step flow from spec §10.4 (as amended in task 001) into a single Playwright spec that exercises the real stack end-to-end: sign in → open Settings dialog → Generate → reveal → copy → close → row visible → trash → confirm → revoked.

## Files

- `apps/e2e/tests/user-tokens/user-tokens.po.ts` — page object. Mirrors the existing `auth.po.ts` shape:
  - `openSettingsDialog()` — clicks the account-dropdown trigger + Settings item.
  - `startCreateFlow()` — clicks the Generate button inside the dialog (empty-state CTA or toolbar button, whichever is rendered).
  - `fillTokenForm({ name, scopes, expiresAt? })` — fills name, checks scopes, optionally changes date.
  - `submitCreateForm()` — clicks Create Token.
  - `getRevealedJwt()` — reads the readonly JWT `<input>` value.
  - `closeRevealView()` — clicks Close.
  - `assertRowVisible(name, { status, scopes })` — asserts the list row.
  - `revokeRow(name)` — clicks the row's trash icon.
  - `confirmRevoke()` — clicks the Revoke button in the inline confirm.
- `apps/e2e/tests/user-tokens/create-reveal-revoke.spec.ts`:
  - One `test.describe.configure({ mode: 'serial' })` — the whole flow runs as a single ordered sequence.
  - Reuses the auth helpers from `tests/auth/auth.po.ts` + `tests/utils/credentials.ts` to create a fresh user for the run.
  - Stubs `navigator.clipboard.writeText` on the page so the Copy assertion doesn't need real clipboard access.
  - 13 steps matching the amended spec §10.4, each as its own assertion block inside a single `test(...)`.

## Acceptance

- [ ] Spec file lives at the path above and runs via `pnpm --filter e2e test user-tokens/create-reveal-revoke`.
- [ ] All 13 amended steps assert visible state.
- [ ] Clipboard read replaced by a spy on `navigator.clipboard.writeText` installed via `page.addInitScript(...)`.
- [ ] Revoked-At timestamp assertion: the row's Revoked-At cell is non-empty and parses as a Date within 2 minutes of `Date.now()`.
- [ ] Test passes against a running `pnpm web:dev` + local Supabase instance.
- [ ] No new `test.setTimeout(...)` calls beyond what the auth flow already uses.

## Test plan

```
pnpm supabase:web:start
pnpm web:dev &
pnpm --filter e2e test user-tokens/create-reveal-revoke
kill %1
```

## Storybook validation

N/A — Playwright spec, not a visual component.

## Notes

- The `data-test` attribute is already configured as the Playwright testid attribute (see `apps/e2e/playwright.config.ts`). All components ship `data-test` hooks from Stories 009/011, so the PO can use `page.getByTestId(...)` directly.
- Flakiness budget: follow the auth PO's `waitForAuthFormReady()` pattern — wait for the submit button to be enabled before typing, give React a 500ms post-hydration beat.
- The e2e assertions are deliberately lenient on the curl snippet content: the public API URL is env-dependent, so assert `contains("Bearer ")` rather than an exact string.
