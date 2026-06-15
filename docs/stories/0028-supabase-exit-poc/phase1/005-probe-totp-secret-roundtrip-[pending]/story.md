---
spec: docs/specs/0028-supabase-exit-poc-phase1.md
spec_sections:
  - "#2-user-stories"
  - "#78-poc-artefacts"
  - "#12-implementation-sequencing"
status: pending
started: null
finished: null
blocks: []
blocked_by:
  - 001-build-better-auth-poc-stack
---

# Probe TOTP secret roundtrip

## Goal

Using the stack from story 001, take a synthetic Supabase-format TOTP secret, import it into Better Auth's `twoFactor` plugin, and verify that a code generated from the original secret is accepted — answering whether MFA users avoid re-enrollment at cutover, as RFC 0015 assumes.

## Scope

**In scope**

- A new `poc/04-totp-migration/` directory on the throwaway branch `poc/supabase-exit` containing the import script, a code-generation helper (using the original secret), and the verification probe against Better Auth's `twoFactor` plugin.
- Findings doc at `docs/poc/0028/04-totp-migration.md` following the RFC §6.2 5-section template, with a Recommendation that names RFC 0015.
- One synthetic secret only — generated in-script, no real Supabase data.

**Out of scope** (forces honest slicing)

- Recovery codes, WebAuthn, SMS factors — different MFA types.
- Multi-user TOTP fixtures.
- Reverse direction (Better Auth → Supabase) — only the migration path matters.
- Re-encryption strategy if the encryption schemes differ — that decision is owned by RFC 0015's spec stage and is informed (not made) by this finding.

## Acceptance criteria

- [ ] `poc/04-totp-migration/` exists on the `poc/supabase-exit` branch with the import script, code-generation helper, and verification probe.
- [ ] The probe runs end-to-end and emits an explicit accepted / rejected verdict for at least one freshly generated code from the original secret.
- [ ] `docs/poc/0028/04-totp-migration.md` exists on `main` with all five template sections and stamps a ✅ / ⚠️ / ❌ outcome.
- [ ] Recommendation §4 names RFC 0015 and the target spec-stage edits (e.g., "0015 §X must add a row on the encryption-scheme delta").
- [ ] No secrets in the findings doc — including the synthetic TOTP secret itself; reference it by length / format only.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

`cd poc/04-totp-migration && pnpm probe` (or equivalent) prints the verification verdict on stdout. Open `docs/poc/0028/04-totp-migration.md` on `main` and verify the outcome stamp matches the observation and the Recommendation names RFC 0015.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- *(none yet)*

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
