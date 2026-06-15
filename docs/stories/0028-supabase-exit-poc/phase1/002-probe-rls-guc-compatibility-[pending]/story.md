---
spec: docs/specs/0028-supabase-exit-poc-phase1.md
spec_sections:
  - "#2-user-stories"
  - "#78-poc-artefacts"
  - "#12-implementation-sequencing"
  - "#13-follow-ups-deferred-not-in-this-phase"
status: pending
started: null
finished: null
blocks: []
blocked_by: []
---

# Probe RLS GUC compatibility

## Goal

Copy a representative 5–10-policy subset of `apps/web/supabase/schemas/*.sql` into a local throwaway database, replace `auth.uid()` with a `current_user_id()` reader over `SET LOCAL app.user_id`, and prove (or disprove) that allow / deny semantics match for one authenticated, one unauthenticated, and one cross-user case per policy.

## Scope

**In scope**

- A new `poc/02-rls-guc/` directory on the throwaway branch `poc/supabase-exit` containing SQL fixtures (the policy subset + a `current_user_id()` shim) and a probe script that drives the three test cases per policy.
- Selection criterion for the 5–10 policies: pick a mix of single-user-row, organization-scoped, and cross-row JOIN-based policies so the sample covers the policy shapes the migration will face.
- Findings doc at `docs/poc/0028/02-rls-guc.md` following the RFC §6.2 5-section template, with a Recommendation that names RFCs 0010 and 0011.

**Out of scope** (forces honest slicing)

- PgBouncer / connection-pool benchmarking — deferred to RFC 0011's spec stage per spec §13.
- Full 91-policy coverage. The PoC is a sample, not a sweep.
- Modifying the source-of-truth schemas under `apps/web/supabase/schemas/` — they are read-only inputs.
- Any change to `apps/server`, `apps/web`, or `packages/`.

## Acceptance criteria

- [ ] `poc/02-rls-guc/` exists on the `poc/supabase-exit` branch with the policy subset, the GUC shim, and the probe script.
- [ ] The probe script runs end-to-end and emits one pass / fail line per (policy × test case).
- [ ] `docs/poc/0028/02-rls-guc.md` exists on `main`, names the five-to-ten policies tested verbatim, and stamps a ✅ / ⚠️ / ❌ outcome.
- [ ] Recommendation §4 of the findings doc names RFCs 0010 and 0011 and the target spec-stage edits.
- [ ] No secrets quoted in the findings doc.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

Run the probe script (`cd poc/02-rls-guc && pnpm probe` or equivalent) against a fresh local Postgres. Observe a per-policy pass / fail summary on stdout. Open `docs/poc/0028/02-rls-guc.md` on `main` and verify the policy list matches and the Recommendation cites both upstream RFCs.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- *(none yet)*

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
