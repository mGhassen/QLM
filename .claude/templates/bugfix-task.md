---
story: ./story.md
status: pending
layer: bugfix
model: sonnet
# The task that spawned this bugfix. `/finish` writes it automatically.
parent_task: NNN-<slug>-[blocked].md
files:
  - <path>
validation:
  # Inherit the parent task's validation kind — the bugfix is done
  # when the parent's validation goes green.
  kind: ui-smoke | e2e | route-test | domain-test | typecheck-only
  # Copy the parent task's kind-specific fields verbatim.
---

# Fix: <what is broken>

## Reproduction

One paragraph. What the `ui-validator` (or whichever runner) observed when it failed. Paste the exact error message or assertion failure.

## Likely cause

One paragraph. The agent's triage note from when it returned `BUG_COMPLEX`. Keep honest — this is a hypothesis, not a proof.

## Files to touch

- `<path>` — <one-line reason>
- `<path>` — <one-line reason>

If the fix ends up touching files outside this list, stop and split the bugfix task — the blast radius was underestimated.

## Done when

- [ ] The parent task's validation runs green.
- [ ] No new console exceptions or network 5xx introduced.
- [ ] The parent task's `[blocked]` pointer is cleared and it re-runs `/finish`.

## Notes

Cap: 3 bullets. Anything longer means the bug deserves a spec amendment, not a task.

- <bullet>
