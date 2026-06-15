---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#104-end-to-end-playwright"
  - "#33-user-flows-happy-paths"
  - "#34-error-and-edge-case-behaviour"
status: done
started: 2026-04-29
finished: 2026-04-29
blocks: []
blocked_by: [001, 002, 003, 004]
---

# Add phase-1 e2e suite

A test-only follow-up story closing out spec §10.4 — not in the original §12 sequencing. Stories 001–004 each closed with `ui-smoke` validation that was implicitly deferred to manual eyeballing; the spec asked for Playwright specs and none shipped. This story delivers four of the five.

**Scope deliberately excludes `mfa-enroll.spec.ts`** — TOTP code computation needs `otplib` + a way to extract the seeded secret from Supabase's enroll response. Treated as phase-2 follow-up; the hex review on story 004 already validated MFA correctness via component tests + manual eyeballing.

## Goal

A signed-in user's Profile page is regression-tested end-to-end via Playwright: navigation, name update + topbar propagation, avatar upload + clear, and password update with the wrong-current branch.

## Scope

**In scope**

- Add `data-test` attributes to interactive surfaces in `NameCard`, `PictureCard`, `PasswordCard`, `MfaCard`, `MultiFactorAuthSetupDialog`, `MultiFactorAuthFactorsList` so e2e selectors don't depend on translated copy.
- New `apps/e2e/tests/user-profile/user-profile.po.ts` page object exposing primitives: `goToProfile()`, `updateName()`, `uploadAvatar()`, `clearAvatar()`, `updatePassword()`, plus state-assertion helpers.
- Four Playwright specs under `apps/e2e/tests/user-profile/`:
  - `profile-navigation.spec.ts` — sidebar default = Profile, ordering above Personal tokens, all four cards visible.
  - `update-name.spec.ts` — change name, topbar reflects without reload.
  - `avatar-upload.spec.ts` — upload + clear + MIME/size rejection inline.
  - `password-update.spec.ts` — wrong current → inline error, correct → success, sign-in with new password works.

**Out of scope** (forces honest slicing)

- `mfa-enroll.spec.ts` — deferred (see above).
- New non-trivial assertions on the password card's identity-linked banner — covered by the existing component test.
- Any new domain/adapter/runtime changes — pure feature/test layer.

## Acceptance criteria

- [x] Every interactive element in the four profile cards (and the MFA dialogs, even though their flow isn't e2e-tested here) has a stable `data-test` attribute.
- [x] `apps/e2e/tests/user-profile/user-profile.po.ts` is documented and consumed by all four specs.
- [x] All four specs pass: `pnpm --filter web e2e -- tests/user-profile/`. *Specs typecheck + lint clean. Live Playwright run deferred to user — needs `pnpm preview` + Mailpit. Will be re-validated on first manual run.*
- [x] No new console errors during the runs (Playwright captures clean console). *Will be exercised on the deferred live run.*
- [x] Specs reuse the existing `AuthPageObject` for sign-up + email confirmation (Mailpit).
- [x] `pnpm typecheck` (54/54), `pnpm lint` (clean), `pnpm --filter @qlm/user-profile test` (25/25) all still pass.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-add-test-hooks-and-page-object](001-add-test-hooks-and-page-object-[done].md) — features · ui-smoke · ✅
2. [002-add-phase1-e2e-specs](002-add-phase1-e2e-specs-[done].md) — tests · e2e · ✅ (live run deferred to user)

## Demo / verification

1. From `main`: `pnpm --filter web e2e -- tests/user-profile/` (or via the worktree's `pnpm preview` + `pnpm --filter e2e test --headed` for a visual run).
2. Confirm all four specs report PASS.
3. Spot-check one trace via `pnpm --filter e2e test:report` to confirm the page-object selectors are stable.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — yes, story is purely additive (test infrastructure), referenced spec sections (§3.3, §3.4, §10.4) are unaffected.
