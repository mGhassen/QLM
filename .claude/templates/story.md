---
spec: docs/specs/<rfc-id>-<rfc-slug>-phase<N>.md
spec_sections:
  - "#<anchor-1>"
  - "#<anchor-2>"
status: pending
started: null
finished: null
blocks: []
blocked_by: []
---

# <Verb-first title, mirrors folder slug>

## Goal

One sentence. User-visible outcome. If you can't write it in one sentence, the story is too big — split it.

## Scope

**In scope**
- <bullet>
- <bullet>

**Out of scope** (forces honest slicing)
- <bullet>

## Acceptance criteria

- [ ] <concrete check, checkable by a reviewer>
- [ ] <concrete check>
- [ ] <concrete check>

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

Concrete commands a human or agent runs to prove the story shipped. "Run X, click Y, observe Z."

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.

---

*Only present when status is `[blocked]`:*

## Blocked on

One paragraph — what the external unblocker is, who owns it, when it was raised.

---

*Only present when status is `[skipped]`:*

## Skipped because

One paragraph — why the story was cut from scope. Leave the folder so the historical record survives.
