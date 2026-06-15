---
description: Iterate on a draft RFC through Q&A rounds until it is ready for /rfc-to-spec.
argument-hint: <rfc-file>
---

You are refining an RFC in this repo. The user ran `/draft-rfc $ARGUMENTS`.

This command is **iterative and interactive**. It does not use plan mode. It asks Q&A rounds via `AskUserQuestion`, edits the RFC in place after each round, and stops when the RFC meets the spec-ready bar. The user can interrupt at any time.

## Inputs

- RFC file: `$1` (must be under `docs/rfcs/` and already exist).
- Gold template: `.claude/templates/rfc.md` — the shape the RFC should eventually match.
- Rules: `.claude/rules/spec-driven-dev.md` — read before anything else.

## Preconditions

- **The RFC file exists.** If not, stop and tell the user to create a placeholder draft first, even a single-line title plus one bullet is enough. Do not create the file for them — an RFC must start from a human's intent.
- **No spec file has been scaffolded for this RFC.** Check for any file matching `docs/specs/<rfc-id>-phase*.md`. If such a file exists, refuse and tell the user:
  > *"RFC `<id>` is immutable because the spec `<path>` already exists. Add an `## Amendments` section to the RFC instead, or bump the RFC to a new version."*

## Steps

1. **Read the RFC in full** and read `.claude/templates/rfc.md` for comparison.
2. **Produce a gap report.** Before asking any question, print a table listing which template sections are missing, incomplete, or present-but-underspecified in the current RFC. This grounds the user in what the upcoming rounds will cover.
3. **Plan the Q&A rounds.** Group questions by concern, not by section. Typical grouping:
   - **Round 1 — fundamental concept.** What is this, who uses it, why does it exist, what is its relationship to existing primitives in the repo?
   - **Round 2 — scope.** What does phase 1 ship, what is deferred, what is the shape of the rollout plan, which RFCs does this depend on or unblock?
   - **Round 3 — design.** Interfaces, layering, tradeoffs, prior art reuse vs replacement, security boundaries.
   - **Round 4 — loose ends.** Alternatives, UX, specific tricky cases surfaced during earlier rounds, unresolved open questions that need a commitment.
   Fewer rounds are allowed when the RFC is close to complete. More rounds are allowed when the concept is genuinely new. There is no fixed number.
4. **Ask each round via `AskUserQuestion`.** Max 4 questions per call. Grouped by concern. Provide 2–4 concrete options per question with a recommendation marked where you have one. Never ask generic "what do you think?" prompts — every question has a clear, scoped decision.
5. **After each round, update the RFC in place via the `Edit` tool.** Write / rewrite / enhance the sections the round's answers inform. Keep edits tight — do not rewrite sections the round did not touch. The edit happens immediately after the round so the user can see the RFC evolve.
6. **Continue until the RFC meets the spec-ready bar** (below). When it does, stop asking questions, print a summary of what changed, and suggest the next command: `/rfc-to-spec <rfc-id> 1`.
7. **If the user interrupts mid-round or gives an "other" answer that reshapes the direction**, adjust the next round accordingly. Never force the user through a round that no longer makes sense.

## Spec-ready bar — all must be true to stop

- Metadata table present and filled in (at minimum: Status, Author, Created, Target).
- §1 Summary is a real paragraph (not a one-liner), ending with an explicit "what phase 1 ships" statement.
- §2 Motivation explains the product-level why in 3–5 paragraphs.
- §3 Goals / Non-goals present, both subsections populated, every non-goal pinned to a named future phase.
- §4 Prior art present (even if the conclusion is "nothing relevant, greenfield").
- At least one feature-specific conceptual-model section present and non-empty.
- Rollout plan table present with **at least one phase row** — phase 1 mandatory; later phases optional but typed, not placeholder.
- Open questions section present. It may contain zero open questions if every decision was resolved during Q&A, but the section header must exist (even if empty) so `/rfc-to-spec` can find it.
- Alternatives considered section present with **at least one entry**. If there is nothing to compare against, state it explicitly ("*Considered none — this RFC is greenfield*"), do not leave it empty.
- References section present.
- Review checklist at the end.

## Invariants

- **The RFC is the only file edited.** No specs, no stories, no rules — just the RFC.
- **Questions go through `AskUserQuestion`.** Never paste a numbered list of questions as prose and ask the user to reply in the chat. The structured tool is load-bearing.
- **Edits are in place, not append-only.** If a section exists and needs reshaping, reshape it. The RFC history lives in git, not in the file.
- **Never write code blocks into the RFC.** This is a conceptual doc. Diagrams, tables, ASCII art, prose — yes. TypeScript interfaces, SQL DDL, shell commands — no. The spec is where code lands.
- **Never run `/rfc-to-spec` from inside this command.** When the RFC is ready, announce and stop. The user invokes the next command themselves — that decision is theirs.
- **Stop if the RFC's scope keeps growing unboundedly.** If you are on round 5 and still finding fundamental questions, the RFC is too ambitious and should be split into two RFCs. Tell the user, do not keep iterating.
- **Respect the immutability rule.** If a spec file appears mid-iteration (the user scaffolded one in a parallel window), stop editing the RFC and report.
