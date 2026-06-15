---
story: ./story.md
status: pending
layer: domain | adapter | shell | server | plugin | features | tests | i18n | db | docs | bugfix
# Optional. Default picked by `/start-story` from `layer:`.
# See `.claude/rules/model-routing.md`.
model: sonnet
files:
  - <path>
# Executable — `/finish` dispatches on `kind` and runs the matching runner.
# See `.claude/rules/validation.md` for the full kind → runner mapping.
validation:
  kind: typecheck-only | domain-test | route-test | ui-smoke | e2e
  # Per-kind fields. Pick one block and delete the rest.
  #
  # domain-test / route-test / e2e:
  # specs:
  #   - <path to spec file>
  #
  # ui-smoke:
  # route: /prj/$projectSlug/dashboard
  # expect_console: empty            # no exceptions, no new warnings
  # expect_network_2xx:              # optional
  #   - /api/billing/status
---

# <Verb-first title, mirrors file slug>

One sentence: what this task produces. Omit if the filename is self-explanatory.

## Done when

- [ ] <concrete done-check>
- [ ] <concrete done-check>

## Notes

Cap: 3 bullets. Non-obvious context only (a gotcha, a deliberate shortcut, a link to the spec anchor).

- <bullet>
