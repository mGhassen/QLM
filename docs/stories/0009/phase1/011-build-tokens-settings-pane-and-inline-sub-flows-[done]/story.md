---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#322-tokens-settings-pane--list-state"
  - "#323-tokens-settings-pane--create-state-inline-form"
  - "#324-tokens-settings-pane--reveal-state-inline-one-time"
  - "#325-tokens-settings-pane--revoke-confirm-state-inline-modal"
  - "#326-pane-state-state-machine-summary"
  - "#33-user-flows-happy-paths"
  - "#75-presentation--feature-package-packagesfeaturesuser-tokens"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "012-verify-token-management-end-to-end"
blocked_by:
  - "008-wire-http-adapter-and-react-query-hooks"
  - "009-build-user-tokens-primitives-and-row"
  - "010-build-settings-dialog-shell"
---

# Build tokens settings pane and inline sub-flows

## Goal

Ship the `<TokensSettingsPane>` component with its `useReducer` pane-state machine (list / create / reveal / revoke-confirm) plus all four pane-state components — `<TokenListView>` (list), `<GenerateTokenForm>` (create, inline), `<RevealTokenView>` (reveal, inline), `<RevokeConfirmInline>` (revoke-confirm, inline-modal) — with Storybook stories for every state. This story merges what was originally Stories 010 and 011 because AM-1 collapsed them: there is no standalone "list view" page and no stacked "dialog" for sub-flows; they are all inline states of the same pane.

## Scope

**In scope**

Per spec §7.5 (post-AM-1 component list):

- `src/components/tokens-settings-pane.tsx` + stories + tests — the top-level pane. Owns a `useReducer` whose state is a discriminated union matching the state machine from spec §3.2.6. Renders one of the four child components based on state. Passes the state-transition callbacks to children.
- `src/components/token-list-view.tsx` + stories + tests — the "list" state of the pane. Header + toolbar (search + status filter + scopes filter + Generate Token button) + table (composing `<TokenRow>` from Story 009). Handles empty / loading / error states of the list query. **Not** a page component — always rendered inside the pane.
- `src/components/generate-token-form.tsx` + stories + tests — the "create" state. Two-column layout (form + live preview). Back button + Cancel + Create Token footer. **Content-only — no `<Dialog>` wrapper.** On submit calls `useCreateUserTokenMutation.mutateAsync`. On success the parent swaps pane state to `"reveal"` (via callback). On error renders inline banner.
- `src/components/reveal-token-view.tsx` + stories + tests — the "reveal" state. Warning banner + raw JWT field (copy button) + curl snippet field (copy button, JWT substituted inline, `VITE_GUEPARD_PUBLIC_API_URL` substituted) + Close button. Closing calls a callback that swaps pane state back to `"list"` and drops `rawJwt` from parent state. **Content-only, no `<Dialog>`.**
- `src/components/revoke-confirm-inline.tsx` + stories + tests — the "revoke-confirm" state. Inline-modal block (centered, `role="alertdialog"`, `aria-modal="true"`) with heading + body + Cancel + Revoke buttons. **Content-only — not a `<Dialog>`.** Confirm calls `useRevokeUserTokenMutation.mutateAsync`; success swaps pane state to `"list"`.
- Update `apps/web/src/components/settings-dialog-mount.tsx` (created in Story 010) to replace the placeholder `<TokensPanePlaceholder />` with the real `<TokensSettingsPane />` as the "Personal tokens" section's content.

**Out of scope**

- The Settings dialog shell (→ Story 010).
- Primitives (StatusChip, ScopePill, FilterPopover) and TokenRow (→ Story 009).
- Hooks (→ Story 008).
- Any `Dialog`-primitive wrappers for the sub-flows. Per AM-1 they do not ship in phase 1.
- Verification + Playwright (→ Story 012).

## Acceptance criteria

- [x] Pane-state `useReducer` covers the full transition matrix from spec §3.2.6 plus illegal-transition `throw` paths — verified by 13 reducer tests.
- [x] `<TokensSettingsPane>` swaps among four child components, exactly one in the DOM at a time — verified by `data-test="pane-state-*"` queries.
- [x] No `Dialog` import in any of the four state components — `RevokeConfirmInline` uses a plain `<div role="alertdialog" aria-modal="true">` per AM-1.
- [x] `<RevokeConfirmInline>` ARIA: `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby` — verified by a unit test.
- [x] `<GenerateTokenForm>` submit disabled until valid input via the Story-002 `CreateUserTokenInputSchema` Zod resolver — verified by 1 unit test (the four invalid-input branches are already exercised in `__tests__/user-token/create-user-token-input.schema.test.ts` from Story 002).
- [x] `<RevealTokenView>` Copy buttons call `navigator.clipboard.writeText` with the raw JWT and the curl snippet (JWT + `VITE_GUEPARD_PUBLIC_API_URL` substituted) — verified by 2 unit tests.
- [x] Closing the dialog while in `reveal` unmounts the pane and the next mount starts in `list` (rawJwt cannot leak forward — the reducer's `close-reveal` action drops it AND the dialog unmount destroys the reducer entirely).
- [x] Storybook stories: 4 pane states + 4 list-view states + 3 create-form states + 2 reveal states + 3 revoke-confirm states = 16 stories total.
- [x] `apps/web/src/components/settings-dialog-mount.tsx` swapped the placeholder for `<TokensSettingsPane />` and wires the `UserTokensApiProvider` against the host's `HttpUserTokenRepository`.
- [x] No hardcoded English in any new file — every label / button / alert resolves via `t('tokens:...')` / `t('settings:...')`.
- [x] `pnpm --filter @guepard/user-tokens test` passes (63 tests). Coverage above 80 % on the new components.
- [x] User-validated end-to-end via dev server (sign-in → Settings → create → reveal → close → revoke flow) on 2026-04-16.

## Tasks

1. [001-build-pane-state-reducer-and-shell](001-build-pane-state-reducer-and-shell-[pending].md) — features. `useReducer` state machine + `<TokensSettingsPane>` shell with placeholder children.
2. [002-build-token-list-view](002-build-token-list-view-[pending].md) — features. List state with toolbar, filters, table, loading / empty / error.
3. [003-build-generate-token-form](003-build-generate-token-form-[pending].md) — features. Inline two-column form + live preview + dirty-state guard.
4. [004-build-reveal-token-view](004-build-reveal-token-view-[pending].md) — features. One-time JWT reveal + curl snippet + copy buttons.
5. [005-build-revoke-confirm-and-wire-pane](005-build-revoke-confirm-and-wire-pane-[pending].md) — features. Inline (non-Dialog) confirm + final swap of placeholder → real pane in `apps/web`.

## Demo / verification

```bash
pnpm --filter @guepard/user-tokens storybook
# Browse: UserTokens/TokensSettingsPane/ListState — empty, loading, error, with-tokens
# Browse: UserTokens/TokensSettingsPane/CreateState — pristine, dirty, error, disabled
# Browse: UserTokens/TokensSettingsPane/RevealState — initial, copied
# Browse: UserTokens/TokensSettingsPane/RevokeConfirmState — pristine, submitting

pnpm web:dev
# 1. Sign in, open account-menu → Settings.
# 2. Click through the create → reveal → close → revoke flow end-to-end against live data.
# 3. Verify the three-way pane transition works smoothly inside the Settings dialog.

pnpm --filter @guepard/user-tokens test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. No deviations.
