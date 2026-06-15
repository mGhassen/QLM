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
blocked_by: []
---

# Diff Better Auth org schema

## Goal

Render the SQL the Better Auth `organization` plugin would emit, diff it against the existing `apps/web/supabase/schemas/` org tables, and quantify the delta — count of field renames, count of breaking shape differences, and the explicit list of each — so RFC 0014's spec stage starts from measured ground.

## Scope

**In scope**

- A new `poc/05-org-schema-diff/` directory on the throwaway branch `poc/supabase-exit` with a script that emits Better Auth's `organization` plugin SQL and produces a diff against the existing org tables in `apps/web/supabase/schemas/`.
- Diff output committed alongside the script.
- Findings doc at `docs/poc/0028/05-org-schema-diff.md` following the RFC §6.2 5-section template, with a Recommendation that names RFC 0014.

**Out of scope** (forces honest slicing)

- Adopting the Better Auth org plugin in any production code path.
- Writing a migration from one shape to the other.
- Testing org-membership flows, invitation flows, role enforcement, or anything runtime — this is a static analysis.
- Comparison against any auth provider other than Better Auth (alternative-provider evaluation is its own phase-1.5 if triggered).

## Acceptance criteria

- [ ] `poc/05-org-schema-diff/` exists on the `poc/supabase-exit` branch with the diff-emitter script and the diff output.
- [ ] The diff output enumerates: (a) field renames with old → new pairs, (b) breaking shape differences with a one-line description each.
- [ ] `docs/poc/0028/05-org-schema-diff.md` exists on `main`, contains the rename count + breaking-difference count + list, and stamps a ✅ / ⚠️ / ❌ outcome.
- [ ] Recommendation §4 names RFC 0014 and the target spec-stage edits.
- [ ] No secrets in the findings doc.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

`cd poc/05-org-schema-diff && pnpm diff` (or equivalent) prints the rename + breaking-change list on stdout. Open `docs/poc/0028/05-org-schema-diff.md` on `main` and verify the same numbers and list appear there.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- *(none yet)*

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
