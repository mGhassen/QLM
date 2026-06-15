---
spec: docs/specs/0028-supabase-exit-poc-phase1.md
spec_sections:
  - "#2-user-stories"
  - "#78-poc-artefacts"
  - "#12-implementation-sequencing"
  - "#9-security-checklist"
status: pending
started: null
finished: null
blocks:
  - 004-probe-bcrypt-rehash-flow
  - 005-probe-totp-secret-roundtrip
blocked_by: []
---

# Build Better Auth PoC stack

## Goal

Stand up Better Auth + Hono + a bare local Postgres so a synthetic user can sign in via email/password end-to-end, providing the foundation that probes #3 and #4 reuse.

## Scope

**In scope**

- A new `poc/01-stack-up/` directory on the throwaway branch `poc/supabase-exit` containing a hello-world Hono app, Better Auth configuration, a local Postgres (Docker), one synthetic user, and a runnable signin script.
- Findings doc at `docs/poc/0028/01-stack-up.md` following the RFC §6.2 5-section template (Hypothesis / Method / Result / Recommendation / Effort spent).
- Recommendation in §4 of the findings doc explicitly names RFC 0012 and a target outcome (✅ ratified / ⚠️ caveat / ❌ refuted).

**Out of scope** (forces honest slicing)

- OAuth, magic link, MFA, organizations, RLS — those are owned by other probes.
- Multi-user fixtures or seeded data beyond the single synthetic user.
- Any production wiring into `apps/server` or `apps/web`.
- Tests, CI, lint enforcement on the PoC code (carve-out per spec §10).

## Acceptance criteria

- [ ] `poc/01-stack-up/` exists on the `poc/supabase-exit` branch with a runnable signin script.
- [ ] The script exits 0 against a fresh local Postgres after a successful Better Auth email/password signin.
- [ ] `docs/poc/0028/01-stack-up.md` exists on `main` with all five template sections populated.
- [ ] Findings doc names RFC 0012 in the Recommendation section and stamps a ✅ / ⚠️ / ❌ outcome.
- [ ] No secrets (Postgres password, Better Auth dev keys) are quoted in the findings doc — names and configuration *keys* only.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

`cd poc/01-stack-up && pnpm install && pnpm signin-fixture` (or equivalent — exact script name pinned at task time) prints a successful Better Auth session payload for the synthetic user. Open `docs/poc/0028/01-stack-up.md` on `main` and verify the five sections are present and the Recommendation names RFC 0012.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- *(none yet)*

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
