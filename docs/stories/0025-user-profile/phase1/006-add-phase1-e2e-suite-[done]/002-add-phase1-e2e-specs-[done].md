---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/e2e/tests/user-profile/profile-navigation.spec.ts
  - apps/e2e/tests/user-profile/update-name.spec.ts
  - apps/e2e/tests/user-profile/avatar-upload.spec.ts
  - apps/e2e/tests/user-profile/password-update.spec.ts
  - apps/e2e/tests/user-profile/fixtures/avatar.png
validation:
  kind: e2e
  specs:
    - apps/e2e/tests/user-profile/profile-navigation.spec.ts
    - apps/e2e/tests/user-profile/update-name.spec.ts
    - apps/e2e/tests/user-profile/avatar-upload.spec.ts
    - apps/e2e/tests/user-profile/password-update.spec.ts
---

# Add phase-1 e2e specs

Four Playwright specs covering the non-MFA Profile flows. Each spec signs up a fresh user via the existing `AuthPageObject` (Mailpit-confirmed), navigates to `/prj/{slug}/user-settings`, and exercises one card.

## Done when

- [ ] `profile-navigation.spec.ts` — sign up, navigate, assert: Profile is the default sidebar item, "Personal tokens" appears below it, all four cards (`Your Profile Picture`, `Your Name`, `Update your Password`, `Multi-Factor Authentication`) are visible.
- [ ] `update-name.spec.ts` — change name to a unique value; assert toast; assert topbar avatar trigger reflects the new name within 1s without reload (uses `expectTopbarName`).
- [ ] `avatar-upload.spec.ts` — upload `fixtures/avatar.png` (small PNG); assert avatar `<img>` src non-empty; click Clear; assert avatar reverts to initials. Negative path: try a `.txt` file via the file input; assert inline error visible; assert no Storage POST in the network log.
- [ ] `password-update.spec.ts` — wrong current password → inline error; correct current + new password ≥ 8 chars + matching confirm → success toast. Sign out + sign in with the new password → assert landing on `/prj/{slug}`.
- [ ] All four pass: `pnpm --filter e2e test tests/user-profile/`.
- [ ] `pnpm --filter e2e lint` + `pnpm --filter e2e typecheck` clean.
- [ ] No new high/critical Playwright console errors during the runs.

## Notes

- Specs typecheck + lint clean; live `pnpm --filter e2e test tests/user-profile/` run deferred to the user (needs live `pnpm preview`).
- The `avatar.png` fixture is a real 8×8 PNG generated via base64 (79 bytes). Kept under `fixtures/`.
- Spec anchors: [§3.3 F1/F2/F3/F4](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths), [§10.4 e2e list](../../../specs/0025-user-profile-phase1.md#104-end-to-end-playwright).
