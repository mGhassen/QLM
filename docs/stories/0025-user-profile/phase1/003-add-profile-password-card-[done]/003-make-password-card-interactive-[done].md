---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/password-card.tsx
  - packages/features/user-profile/src/components/password-card.stories.tsx
  - packages/features/user-profile/__tests__/password-card.test.tsx
  - packages/apps/user-settings/src/sections/profile.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Make password card interactive

Replace the disabled placeholder with a working RHF form. Wire `useUserIdentities()` to drive the gated banner. On submit, call `shell.personalAccount.updatePassword({current, next})`; map `InvalidCurrentPasswordException` to an inline error on the `currentPassword` field.

## Done when

- [ ] `PasswordCard` uses `useForm` with `current`, `next`, `confirm` fields; client-side validation: all required, `next.length >= 8`, `next === confirm`, `next !== current`.
- [ ] `sections/profile.tsx` resolves `isProviderConnected('email')` from `useUserIdentities()` and passes it to `PasswordCard`.
- [ ] On submit: `useMutation` wraps `shell.personalAccount.updatePassword({current, next})`; success toast `userProfile.password.updated`; on `InvalidCurrentPasswordException`, set inline error on `currentPassword` via `form.setError`.
- [ ] OAuth-only branch still renders the warning banner; no form input or submit affordance.
- [ ] Storybook variants: `Linked`, `OauthOnly`, `WrongCurrent` (renders an inline error mock), `Submitting` (disabled fields).
- [ ] Component tests cover: linked-render-form, oauth-only-render-banner, valid-submit-calls-mutation, wrong-current-shows-inline-error, mismatch-shows-inline-error.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm --filter @qlm/user-profile test` all pass.

## Notes

- After a successful submit, reset the form to clean values (don't preserve `current`/`next` in DOM).
- The `useUserIdentities()` hook already exists in `packages/supabase/src/hooks/use-user-identities.ts`; just import it.
- Spec anchors: [§3.3 F4](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths), [§1 Q#2 (re-auth on submit only)](../../../specs/0025-user-profile-phase1.md#1-resolved-open-questions).
