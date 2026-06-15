---
story: ./story.md
status: pending
layer: docs
files:
  - docs/stories/0009/phase1/012-verify-token-management-end-to-end-[wip]/story.md
---

# Run final pnpm check gate + log cross-repo + follow-up tickets

## Purpose

Run the full repo-level gate (`pnpm check`: format, lint, typecheck, build, test) and document any pre-existing failures unrelated to RFC 0009. Log the two spec-mandated tickets under the story's Questions so the user can file them in GitHub (they require human context + an auth token the story does not carry).

## Files

- `docs/stories/0009/phase1/012-verify-token-management-end-to-end-[wip]/story.md` — append under "Questions surfaced":
  - Coverage results (from task 001).
  - Playwright spec path + any flakiness observations (from task 002).
  - `pnpm check` failure categories (pre-existing vs. 0009-introduced).
  - Cross-repo ticket description for `qlm-public-api` schema rename (copy verbatim from spec §7.10).
  - Follow-up ticket description for `user_tokens.revoked NOT NULL` (copy verbatim from spec §13).

## Acceptance

- [ ] `pnpm check` executed; every failure categorized as (a) pre-existing unrelated to 0009, or (b) 0009-scope.
- [ ] If any (b) failure exists: stop and file a new story instead of silently patching here.
- [ ] Cross-repo ticket text + follow-up ticket text both appear in the story's Questions section, ready for the user to paste into GitHub.
- [ ] No code changes outside the story markdown in this task — it's a gate + documentation step.

## Test plan

```
pnpm check 2>&1 | tee /tmp/phase1-final-gate.log
```

## Storybook validation

N/A — gate + docs task.

## Notes

- Known pre-existing failure: `apps/server` tests crash on `@mlc-ai/web-llm`'s ESM `require` reference. Unrelated to 0009 — documented in Story 006's Questions already.
- The tickets aren't filed from this task; they're handed over for the user to create so they land on the right GitHub project.
