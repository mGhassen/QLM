---
story: ./story.md
status: pending
layer: docs
files:
  - docs/specs/0009-token-management-phase1.md
---

# Amend spec §10.4 to match AM-1 + coverage audit

## Purpose

Spec §10.4 (end-to-end Playwright) was authored before RFC 0009 AM-1 (the settings-dialog restructuring). Its 13 steps reference a `/user/tokens` URL that no longer exists — the flow lives inside the settings dialog now. Amend via the spec Changelog, then audit coverage on the user-tokens + domain-services code we just shipped.

## Files

- `docs/specs/0009-token-management-phase1.md` — amend §10.4 (rewrite steps 2–3 + 9 to go through the Settings dialog instead of `/user/tokens`) AND append a Changelog entry explaining the amendment. The step count stays at 13; only the entry points change.

## Acceptance

- [ ] Spec §10.4 steps 2–3 + 9 updated to match AM-1: open the account dropdown → click **Settings** → dialog opens with "Personal tokens" selected; close the dialog at the end of the flow.
- [ ] Changelog entry added explaining the amendment.
- [ ] `pnpm --filter @qlm/user-tokens exec vitest run --coverage --coverage.include='src/**'` reports ≥ 80 % line coverage on the shipped code.
- [ ] `pnpm --filter @qlm/domain exec vitest run __tests__/services/user-token --coverage --coverage.include='src/services/user-token/*'` reports ≥ 90 %.
- [ ] Coverage results logged under the story's Questions section.

## Test plan

```
pnpm --filter @qlm/user-tokens exec vitest run --coverage --coverage.include='src/**'
pnpm --filter @qlm/domain exec vitest run __tests__/services/user-token --coverage --coverage.include='src/services/user-token/*'
```

## Storybook validation

N/A — docs-only task + coverage audit.

## Notes

- The spec amendment is allowed: the Changelog mechanism is the documented way to capture post-merge deviations.
- If coverage is below target, backfill tests ONLY in the affected files — do not add tests for code outside the story's scope.
