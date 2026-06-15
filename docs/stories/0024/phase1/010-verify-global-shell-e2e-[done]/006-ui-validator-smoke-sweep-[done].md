---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - docs/stories/0024/phase1/010-verify-global-shell-e2e-[wip]/006-ui-validator-smoke-sweep-[pending].md
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/dashboard
  expect_console: empty
---

# Run ui-validator smoke sweep across topbar + settings apps

Final phase-1 sanity: walk the topbar dropdown + both settings apps with the `ui-validator` agent, verifying zero new console warnings and zero network failures on the smoke-scope §10.5 path.

## Done when

- [ ] Dashboard loads with shell visible, zero console errors.
- [ ] Topbar dropdown opens; PROJECT + ORGANIZATION sections present, no ACCOUNT section.
- [ ] Project settings shortcut lands at `/prj/$projectSlug/project-settings?section=general`, renders General form.
- [ ] Invite members shortcut lands at `/prj/$projectSlug/org-settings?section=members`, renders Members table.
- [ ] Billing & usage shortcut lands at `/prj/$projectSlug/org-settings?section=billing`, renders BillingUI.
- [ ] Organization settings shortcut lands at `/prj/$projectSlug/org-settings?section=general`.
- [ ] Switching inner sidebar keeps `?section=` in sync.
- [ ] No new console warnings or network 4xx/5xx attributable to this story's changes.

## Notes

- This task has no code files — its `files:` only lists itself so `/finish` sees an allowlist. The ui-validator may only inline-fix issues that fall inside another task's allowlist (not this one); anything else is `BUG_COMPLEX`.
- Pre-existing noise (PostHog `config.js` 200-HTML 404, root-providers hydration warning) is not a regression — note it in the agent's triage but don't block.
