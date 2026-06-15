---
description: Generate verb-first story folders from a phase spec, grouped by the spec's implementation sequencing.
argument-hint: <spec-file>
---

You are generating stories for a phase spec. The user ran `/spec-to-stories $ARGUMENTS`.

## Inputs

- Spec file: `$1` (path under `docs/specs/`, named `<rfc-id>-<rfc-slug>-phase<N>.md`).
- Template: `.claude/templates/story.md`.
- Rules: `.claude/rules/spec-driven-dev.md` (read before anything else).

## Steps

1. **Enter plan mode.** Nothing is created until the user approves the plan.
2. **Parse the spec filename** to derive the story-tree root:
   - Match `<rfc-id>-<rfc-slug>-phase<N>.md`. Example: `0024-global-shell-ui-phase1.md` → `rfc-id=0024`, `rfc-slug=global-shell-ui`, `phase=1`.
   - If the filename doesn't match, refuse and tell the user to rename the spec to the canonical shape.
   - The story-tree root is `docs/stories/<rfc-id>-<rfc-slug>/phase<N>/`. Never `docs/stories/<rfc-id>/...` — omitting the slug breaks `grep`-by-keyword and makes the tree ambiguous when multiple RFCs share a numeric prefix.
3. **Read the spec in full.** Extract:
   - §2 User stories (they anchor the goal sentence of each story),
   - §7 File-by-file work items (they anchor the scope and tasks),
   - §12 Implementation sequencing (it anchors the *order* and the stage grouping).
4. **Slice the spec into 4–12 stories.** Each story must:
   - Be **verb-first**: `NNN-attach-public-dataplane`, not `NNN-public-dataplane-attachment`.
   - Fit 1–3 days of focused work.
   - Be demoable end-to-end in under 5 minutes.
   - Touch no more than two hexagonal layers with non-trivial changes.
   - Map to a single stage in §12, or clearly span two adjacent stages.
   - Reference spec sections by **markdown anchor**, never by section number.
5. **If the slice produces fewer than 4 or more than 12 stories**, stop and report it as a spec-sizing problem. Do not generate.
6. **Plan the full tree** under `docs/stories/<rfc-id>-<rfc-slug>/phase<N>/` (derived in step 2):
   - One folder per story, named `NNN-verb-slug-[pending]/`.
   - Each folder contains exactly one file at scaffold time: `story.md`.
   - Task files are **not** created here — `/start-story` generates them when the story enters wip.
7. **Present the planned list** to the user via ExitPlanMode: story id, verb-first slug, one-sentence goal, spec anchors, rough stage. Include the resolved tree root so the user can confirm the slug before writes.
8. **After approval**, write every `story.md` from the template:
   - Fill `spec:` / `spec_sections:` / `blocks:` / `blocked_by:` in frontmatter.
   - Fill the Goal, Scope, Acceptance criteria, and Demo sections from the spec.
   - Leave Tasks, Questions surfaced, and Spec-accuracy check as template placeholders.

## Invariants

- **Phase N+1 stories never exist until phase N+1's spec exists.** Refuse to generate for a non-existent phase.
- **Verb-first slugs, always.** Reject noun-first during self-review before writing.
- **Story-tree root always carries the RFC slug.** `docs/stories/<rfc-id>-<rfc-slug>/...` — never the bare id.
- **Story folders are flat.** No subfolders.
- **Every story references at least one spec anchor.** A story without a spec anchor is a drift vector.
