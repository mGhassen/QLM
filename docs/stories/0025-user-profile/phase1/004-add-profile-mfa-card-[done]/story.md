---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#321-profile-section-prjsluguser-settings-sidebar--profile"
  - "#322-mfa-setup-dialog-modal"
  - "#33-user-flows-happy-paths"
  - "#34-error-and-edge-case-behaviour"
  - "#51-data-shapes"
  - "#71-domain-packagesdomain"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
  - "#73-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-package-packagesfeaturesuser-profile"
  - "#9-security-checklist"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-28
finished: 2026-04-28
blocks: []
blocked_by: [001]
---

# Add profile MFA card

## Goal

A signed-in user can see their MFA factor list, enroll a TOTP factor end-to-end (friendly name → QR code → 6-digit verification), and unenroll a factor after re-entering their current password.

## Scope

**In scope**

- Domain: `MfaFactorSchema`, `EnrollTotpOutputSchema`, `IMfaRepository` port (`listFactors`, `enrollTotp`, `challenge`, `verify`, `unenroll`), `EnrollTotpService`, `VerifyMfaFactorService`, `UnenrollFactorService`.
- Adapter: `packages/repositories/supabase/src/mfa.repository.ts` delegating to `client.auth.mfa.*`; wiring in `apps/web/src/lib/repositories-factory.ts`.
- Shell runtime: `shell.mfa.*` with shared query key `['mfa-factors', userId]`; session refresh after verify.
- Presentation:
  - `MfaCard` — factor list + empty-state callout + *Setup a new Factor* CTA.
  - `MultiFactorAuthFactorsList` — per-row unenroll with current-password confirmation.
  - `MultiFactorAuthSetupDialog` — 3-step flow (friendly-name → QR + manual secret → 6-digit OTP verify), `onInteractOutside`/`onEscapeKeyDown` suppressed mid-flow, pending-factor cleanup on cancel.
  - Storybook stories for: empty state, with-factors state, each of the three dialog steps.
- i18n: `userProfile.mfa.*` namespace; error copy reuses existing `auth.errors.*`.
- Security gates per spec §9: session-only for first-factor enroll, current-password re-auth for unenroll, TOTP secret never logged.

**Out of scope** (forces honest slicing)

- Recovery / backup codes (deferred to phase 2 — spec §13).
- WebAuthn / passkeys.
- Sign-in factor verification, AAL2 policy enforcement, step-up-to-AAL2 — RFC 0013.
- Avatar, name, password cards.

## Acceptance criteria

- [x] With no factors enrolled, the card shows the empty-state callout and an active *Setup a new Factor* button.
- [x] Clicking *Setup a new Factor* opens the dialog; step 1 asks for a friendly name; step 2 shows a scannable QR plus a manual-entry string; step 3 accepts a 6-digit code.
- [x] Entering a correct OTP closes the dialog, refreshes the session, shows a success toast, and renders the factor in the list. *Verify mutation chains `shell.mfa.verify` → `supabase.auth.refreshSession()` → toast + `invalidate.factors`.*
- [x] Entering a wrong OTP keeps the dialog on step 3 with an error. *Surfaced via `verifyError` prop keyed to `userProfile.mfa.verifyError`. The spec mentioned `auth:errors.*` — using a single i18n string is functionally equivalent and consistent with the password card pattern.*
- [x] Cancelling the dialog mid-flow after a factor was created calls `unenroll` so no dangling factor remains. *`onCancelMfaSetup` in `sections/profile.tsx` calls `shell.mfa.unenroll(pendingFactorId)` best-effort.*
- [x] Unenroll prompts for the current password; wrong password keeps the factor; correct password removes it and refreshes the list. *`unenrollMutation` calls `signInWithPassword` first; failure throws `invalidCurrentPasswordException` and surfaces inline.*
- [x] First-factor enrollment does not require AAL2 — `IMfaRepository.enrollTotp` has no AAL precondition; the runtime resource doesn't gate either. Spec §9 explicitly calls this out.
- [x] No MFA-related console log contains the TOTP secret, QR data URI, or password. *Adapter does not log; secret/QR are passed to `<img src>` and `<Input value>` directly.*
- [x] `pnpm typecheck` (54/54), `pnpm lint` (clean), `pnpm --filter @qlm/domain test` (314 / 3 skipped), `pnpm --filter @qlm/repository-supabase test` (23 / 23), `pnpm --filter @qlm/user-profile test` (25 / 25) all pass. *Playwright `mfa-enroll.spec.ts` is part of the phase-1 spec §10.4 deliverable, deferred to a phase-1 close-out e2e task — not in this story's scope.*

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-add-readonly-mfa-card](001-add-readonly-mfa-card-[done].md) — features · ui-smoke · ✅
2. [002-wire-mfa-spine](002-wire-mfa-spine-[done].md) — adapter · domain-test · ✅
3. [003-make-mfa-card-interactive](003-make-mfa-card-interactive-[done].md) — features · ui-smoke · ✅

## Demo / verification

1. `pnpm supabase:web:start && pnpm dev`, sign in as a seeded user with no MFA factors.
2. **Settings → Profile** → **Multi-Factor Authentication**: confirm empty-state callout.
3. Click *Setup a new Factor*. Enter a friendly name, continue.
4. Scan the QR with an authenticator app (or paste the manual-entry string). Continue.
5. Enter the 6-digit code. Confirm toast, dialog closes, factor appears in the list.
6. Intentionally enter a wrong OTP first — confirm error, retry succeeds.
7. Start a second enrollment, cancel mid-dialog after the QR. Verify in Supabase that no unverified factor lingers (SQL on `auth.mfa_factors`).
8. Click remove on the factor. Enter a wrong current password → confirm factor still listed. Enter the correct one → confirm factor removed and list empty.
9. Check browser console + Network tab during each step: no TOTP secret or password leaks; no 4xx/5xx unaccounted for.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — **no**: wrong-OTP error uses a single i18n string instead of per-code `auth:errors.<code>` mapping (intentional, security-aligned with §8.1 generic-auth-errors rule). See spec §Changelog 2026-04-28.
