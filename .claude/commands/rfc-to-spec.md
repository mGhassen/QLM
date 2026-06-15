---
description: Scaffold a phase spec from an existing RFC using the gold spec template.
argument-hint: <rfc-id> <phase>
---

You are scaffolding a phase spec for an RFC in this repo. The user ran `/rfc-to-spec $ARGUMENTS`.

## Inputs

- RFC file: `docs/rfcs/<rfc-id>-<rfc-slug>.md` (glob the id prefix — `docs/rfcs/<rfc-id>-*.md`). The matched filename's `<rfc-slug>` carries forward into the spec and story paths.
- Phase number: second argument.
- Template: `.claude/templates/spec.md`.
- Rules: `.claude/rules/spec-driven-dev.md` (read it before anything else).

## Steps

1. **Enter plan mode.** Do not create files yet.
2. **Resolve the RFC file via glob** and extract `<rfc-slug>` from its filename — everything between `<rfc-id>-` and `.md`. If zero or multiple RFCs match the id, refuse and ask the user to disambiguate.
3. **Read the RFC in full.** Extract:
   - the metadata table,
   - §1 Summary,
   - the Goals / Non-goals block,
   - the Open questions (or Resolved questions, if the RFC has been amended),
   - the Rollout plan row for the requested phase.
4. **Verify the phase exists** in the RFC's rollout plan. If not, stop and tell the user which phases are defined.
5. **Read `.claude/templates/spec.md` verbatim** as the skeleton.
6. **Draft the new spec file** at `docs/specs/<rfc-id>-<rfc-slug>-phase<N>.md` with:
   - metadata table filled in,
   - §1 Resolved open questions pre-populated with the RFC's open questions as rows, resolutions left blank for the user to fill,
   - §2 User stories pre-populated from the RFC's summary bullets that fall inside the phase,
   - §7 work items pre-populated with empty subsection headings matching the hexagonal layers,
   - every other section left as template placeholders.
7. **Present the planned file path and a section outline to the user** via ExitPlanMode. Do not write the file until approval.
8. **After approval**, write the file. Do not edit the RFC.

## Invariants

- **The RFC is immutable** from this point forward. If changes are needed, append an `## Amendments` section to the RFC, do not edit its body.
- **Every RFC open question becomes a spec §1 row.** Leaving one out is a drift vector.
- **The spec file path is exactly** `docs/specs/<rfc-id>-<rfc-slug>-phase<N>.md`. No variants — the slug mirrors the RFC filename and carries into `docs/stories/<rfc-id>-<rfc-slug>/...`.
- **One spec per phase.** If the phase already has a spec, stop and tell the user it exists.
