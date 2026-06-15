# RFC <id> — <title>

| Field      | Value                                     |
| ---------- | ----------------------------------------- |
| Status     | Draft                                     |
| Author     | <name>                                    |
| Created    | <YYYY-MM-DD>                              |
| Target     | <what this RFC scopes>                    |
| Supersedes | —                                         |
| Related    | <links to related RFCs, if any>           |

## 1. Summary

One or two paragraphs. What this RFC introduces, in its own terms. End with an explicit bullet list of the primitives or capabilities it delivers, and an explicit statement of what phase 1 ships versus what is deferred to later phases.

Written so that a reviewer who reads only §1 and §3 walks away with the right mental model.

## 2. Motivation

Why this exists. The product-level problem this solves. What is broken or missing today that this RFC fixes. Three to five paragraphs, not a one-liner.

Link upstream to RFCs this one depends on, and downstream to RFCs that will depend on this one once it lands. Be explicit about which way the dependency flows.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Bulleted list. Each goal is an **observable exit criterion**: if the implementation satisfies every bullet here, phase 1 is done.

- <goal>
- <goal>

### 3.2 Non-goals (phase 1)

Bulleted list. Each non-goal is a **deferred item pinned to a named future phase**. "Not yet" is fine. "Never" is also fine. "We don't know yet" is not — that is an open question, not a non-goal.

- **<Non-goal>.** Phase <N>.
- **<Non-goal>.** Phase <N>.

## 4. Prior art in the codebase

What already exists in this repo that this RFC relates to. Be explicit:

- **Reused**: <existing thing> — <how this RFC builds on it>.
- **Replaced**: <existing thing> — <why this RFC supersedes it>.
- **Orthogonal**: <existing thing> — <why this RFC does not touch it>.

Link to concrete file paths where useful. If the RFC is genuinely greenfield, say so and list the files that would have been relevant but aren't.

## 5. Conceptual model

The core mental model this RFC introduces. Entities, relationships, lifecycle. Written before any implementation detail. If every other section were deleted, §1 plus this section plus §3 should still tell a reviewer what the feature is and why.

Use sub-sections (5.1, 5.2, …) as needed. One per distinct concept.

## 6+. Feature-specific sections

Add as many sections as the RFC needs — one per distinct concern. Common choices:

- **Architecture overview** — layering diagram, data flow, component boundaries.
- **Data model** — conceptual only; concrete DDL belongs in the spec.
- **Interface contracts** — between components, between layers.
- **Security and trust boundaries** — who can see what, where secrets live, what the attacker model is.
- **UX surface and product integration** — where in the app this lives, how users reach it, how it relates to existing screens.
- **Operational considerations** — observability, rollback, billing, credits, licensing.

No rule about how many sections. The rule is: every section has a reason to exist. Cut any section that does not.

## <N>. Rollout plan

| Phase | Scope                                      | Artifacts              | Status |
| ----- | ------------------------------------------ | ---------------------- | ------ |
| 1     | <what phase 1 delivers; ties back to §3.1> | This RFC + phase-1 spec | Draft  |
| 2     | <what phase 2 delivers>                    | Phase 2 RFC            | Future |
| 3     | <what phase 3 delivers>                    | Phase 3 RFC            | Future |

Each row is an independent RFC/spec pair. Incremental delivery is the default. A phase that is just "more of phase 1" is not a phase — collapse it into phase 1 or describe the new capability.

## <N>. Open questions

These must be resolved before a phase-1 spec can be written. Each question is a **real decision the RFC cannot make alone** — not a placeholder for work, not a note-to-self.

1. **<Question>.** <One sentence explaining what is at stake and why the RFC cannot resolve it unilaterally.> Proposal: <leaning, if any>.
2. **<Question>.** …

`/draft-rfc` iterates on this section through Q&A. `/rfc-to-spec` copies every row into the spec's §1 Resolved open questions table. Leaving a question unresolved at the end of the RFC is a commitment to resolve it during spec drafting; leaving one out entirely is a drift vector.

## <N>. Alternatives considered

Each bullet is a path not taken, with a concrete reason. This section protects future maintainers from re-litigating decisions already made.

- **<Alternative>.** Rejected / Deferred / Considered. <Why, in one or two sentences.>
- **<Alternative>.** …

## <N>. References

- Internal doc paths — rules files, other RFCs, prior specs.
- External specs or standards the RFC leans on.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §<N> have a concrete reason it was not chosen?
