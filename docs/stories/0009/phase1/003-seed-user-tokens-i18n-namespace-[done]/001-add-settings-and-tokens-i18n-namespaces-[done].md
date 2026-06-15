---
story: ./story.md
status: done
layer: i18n
files:
  - apps/web/src/lib/i18n/locales/en/settings.json
  - apps/web/src/lib/i18n/locales/en/tokens.json
  - apps/web/src/lib/i18n/i18n.settings.ts
---

# Add settings and tokens i18n namespaces

## Purpose

Ship the two i18n namespaces required by RFC 0009 phase 1 (post-AM-1): `settings.*` for the Settings dialog shell and `tokens.*` for the tokens pane. Both land as JSON files at `apps/web/src/lib/i18n/locales/en/` (the actual location used by this repo — spec §7.8 pointed at `packages/i18n/src/locales/` which is incorrect; logged as a Changelog deviation). Register both namespaces in `defaultI18nNamespaces` so `t('settings.menu.label')` and friends resolve everywhere.

## Files

- `apps/web/src/lib/i18n/locales/en/settings.json` — new. Keys from spec §11 "Settings-shell namespace":
  - `settings.menu.label` — "Settings"
  - `settings.dialog.title` — "Settings"
  - `settings.dialog.close` — aria-label
  - `settings.dialog.discardGuard` — confirm()-guard body
  - `settings.nav.personalTokens` — "Personal tokens"
- `apps/web/src/lib/i18n/locales/en/tokens.json` — new. Keys from spec §11 "Tokens namespace":
  - `tokens.page.title`, `tokens.page.subtitle`
  - `tokens.toolbar.*` (searchPlaceholder, status, scopes, generate)
  - `tokens.table.*` (name, expires, status, createdAt, revokedAt, scopes, actions, notApplicable, revokeAriaLabel)
  - `tokens.status.*` (active, expired, revoked)
  - `tokens.scopes.*` (read, write, admin + readHelp, writeHelp, adminHelp)
  - `tokens.pane.create.*` (title, subtitle, back, nameLabel, namePlaceholder, scopesLabel, expiresLabel, preview.title, preview.notSet, cancel, submit)
  - `tokens.pane.reveal.*` (heading, warning, jwtLabel, curlLabel, copyJwt, copyCurl, copied, close)
  - `tokens.pane.revoke.*` (heading, body, cancel, confirm, toastSuccess)
  - `tokens.empty.*` (heading, body, action)
  - `tokens.errors.*` (listHeading, retry, generic, invalidName, invalidScopes, expirationTooFar, expirationInPast, notFound, alreadyRevoked)
  - `tokens.events.*` (6 event-type keys per spec §11)
- `apps/web/src/lib/i18n/i18n.settings.ts` — add `'settings'` and `'tokens'` to the `defaultI18nNamespaces` array so both namespaces load at i18n initialization.

## Acceptance

- [ ] `apps/web/src/lib/i18n/locales/en/settings.json` exists with every `settings.*` key from spec §11 with real English copy (no placeholder strings).
- [ ] `apps/web/src/lib/i18n/locales/en/tokens.json` exists with every `tokens.*` key from spec §11 with real English copy.
- [ ] Both JSON files are valid JSON — parse without errors.
- [ ] `defaultI18nNamespaces` in `i18n.settings.ts` includes `'settings'` and `'tokens'`.
- [ ] `pnpm typecheck` across apps/web passes (new namespace registration doesn't break anything).
- [ ] `pnpm --filter web build` succeeds (JSON imports resolve).
- [ ] No typos in any key name — verified by string-diffing the key inventory against spec §11.
- [ ] The `TODO(story-003)` comments in `packages/ui/src/guepard/layout/user-profile-menu.tsx` and `packages/ui/src/guepard/shell/shell-user-profile-menu.tsx` are resolved: either removed (if the literal string matches other literal strings in the same component — the UI package's convention) or the literal is hoisted to a prop that consumers localize. Decision during implementation.

## Test plan

```
pnpm typecheck
pnpm --filter web build
# Confirm JSON validity
node -e "console.log(Object.keys(require('./apps/web/src/lib/i18n/locales/en/settings.json')).length, 'top-level settings keys')"
node -e "console.log(Object.keys(require('./apps/web/src/lib/i18n/locales/en/tokens.json')).length, 'top-level tokens keys')"
```

## Storybook validation

N/A — not a UI task. (This adds i18n JSON files + registers namespaces; no component changes.)

If the task ends up editing `packages/ui/src/guepard/layout/user-profile-menu.tsx` or `shell-user-profile-menu.tsx` to resolve the `TODO(story-003)` markers by hoisting the "Settings" label to a prop, **then it becomes a UI task** and Storybook validation applies: rerun `pnpm --filter @guepard/ui storybook` and confirm both menus still show "Settings" as the nav-item label in their Default stories. Document whichever path is taken in the Notes.

## Notes

- `t('settings.menu.label')` is called from `apps/web/src/routes/organizations.tsx` and `apps/web/src/shell/project-shell-host.tsx` (the two account-menu call sites) — if the label is localized there (not in the UI package), the TODO(003) markers can simply be dropped without changing the UI package. That's the cleanest path and preserves the existing "literals in @guepard/ui primitives, localized by consumers" convention.
- No non-English locale files land in this task — spec §7.8 says English-only in phase 1 (non-English placeholders are added when non-English locales exist, which they don't yet).
- Every key in the JSON files should match the spec §11 list exactly; adding keys beyond spec §11 is scope creep (defer to later tasks). Removing or renaming keys is a deviation (log in story Notes).
