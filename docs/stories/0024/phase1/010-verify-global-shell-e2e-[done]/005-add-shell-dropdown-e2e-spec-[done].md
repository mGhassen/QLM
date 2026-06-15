---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/e2e/tests/shell/shell-dropdown.spec.ts
  - apps/e2e/tests/shell/fixtures.ts
validation:
  kind: e2e
  specs:
    - apps/e2e/tests/shell/shell-dropdown.spec.ts
---

# Add the shell-dropdown Playwright e2e spec

Ship the spec §10.4 cases as a new Playwright spec. Path correction: the e2e package lives at `apps/e2e/`, not `apps/web/e2e/` — this task uses the actual location. Log the path in the story's Questions surfaced.

## Done when

- [ ] `apps/e2e/tests/shell/shell-dropdown.spec.ts` covers the 8 cases listed in spec §10.4.
- [ ] Spec uses the existing `data-test` attribute convention (`testIdAttribute: 'data-test'` in `playwright.config.ts`) — no `data-testid`.
- [ ] If helper fixtures are needed (sign-in + pre-create org/project), add them under `apps/e2e/tests/shell/fixtures.ts` and reuse shared helpers from `apps/e2e/tests/utils/` where possible.
- [ ] `pnpm --filter e2e test tests/shell/shell-dropdown.spec.ts` passes locally against a running preview.

## Notes

- The 8 cases: shell renders on authed routes · dropdown structure (PROJECT + ORGANIZATION, no ACCOUNT) · switch project · switch org (lands on last-visited project) · new-project / new-org dialogs · Invite/Billing/Org-settings shortcuts · `/organizations` redirect · Esc + outside-click close without navigating.
- Mailpit isn't required for this spec — use the existing `owner@qlm.run` / `testingpassword` sign-in pattern from `apps/e2e/tests/orgs/` (or equivalent).
