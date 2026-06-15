---
spec: docs/specs/0028-supabase-exit-poc-phase1.md
spec_sections:
  - "#1-resolved-open-questions"
  - "#2-user-stories"
  - "#78-poc-artefacts"
  - "#12-implementation-sequencing"
  - "#13-follow-ups-deferred-not-in-this-phase"
status: pending
started: null
finished: null
blocks: []
blocked_by:
  - 001-build-better-auth-poc-stack
---

# Probe bcrypt rehash flow

## Goal

Using the stack from story 001, seed a synthetic user whose password is stored as a Supabase-format bcrypt hash, sign in via Better Auth, and confirm whether the row was rehashed to argon2id on success — answering whether RFC 0015's "zero password resets at cutover" promise is achievable as designed.

## Scope

**In scope**

- A new `poc/03-dual-verify/` directory on the throwaway branch `poc/supabase-exit` containing the seeding script (one user, bcrypt-hashed password), the signin probe, and a post-condition check that inspects the password column's hash format after signin.
- Findings doc at `docs/poc/0028/03-dual-verify.md` following the RFC §6.2 5-section template, with a Recommendation that names RFC 0015.
- **If the result is ❌ refuted**, the Recommendation also names a candidate alternative auth provider per spec §1 Q1 / RFC §9.1 — chosen from the deferred candidates (GoTrue self-hosted, Auth.js, etc.). This is the trigger for a phase-1.5 round, recorded but not executed here.

**Out of scope** (forces honest slicing)

- Building a custom Better Auth plugin if the verifier hook turns out to be missing — the build vs swap-provider decision is owned by RFC 0015's spec stage, not this story.
- Multi-user fixtures or password-policy edge cases.
- Argon2id parameter tuning (cost / memory / parallelism) — phase 2.

## Acceptance criteria

- [ ] `poc/03-dual-verify/` exists on the `poc/supabase-exit` branch with the seeding script, signin probe, and post-condition check.
- [ ] The probe runs end-to-end against the story-001 stack and emits an explicit observation: rehashed-to-argon2id (✅), still-bcrypt-after-login (❌), or partial / version-pinned behaviour (⚠️).
- [ ] `docs/poc/0028/03-dual-verify.md` exists on `main` with all five template sections.
- [ ] Recommendation §4 names RFC 0015 and stamps a ✅ / ⚠️ / ❌ outcome.
- [ ] If ❌, Recommendation §4 also names a candidate alternative provider and motivates the choice in one sentence.
- [ ] No secrets in the findings doc — Better Auth dev secret, bcrypt salt material, and seeded password are all referenced by name only.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

`cd poc/03-dual-verify && pnpm probe` (or equivalent) prints the password-column hash format before and after the signin. Open `docs/poc/0028/03-dual-verify.md` on `main` and verify the outcome stamp matches the observation and the Recommendation names RFC 0015.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- *(none yet)*

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
