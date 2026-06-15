---
spec: docs/specs/0028-project-shell-tab-bug-patches-phase1.md
spec_sections:
  - "#1-resolved-open-questions"
  - "#5-api-contracts"
status: pending
started: null
finished: null
blocks: []
blocked_by: []
---

# Fix tab-key collision on malformed tid

## Goal

A request with a garbage `tid` query param produces a distinct sentinel `tabKey` that does not collapse onto the clean `routeBase` tab.

## Scope

**In scope**
- `packages/shell-contracts/src/tab-key.ts` — change the malformed-`tid` fallback to `${routeBase}#invalid:${tid}`.
- `packages/shell-contracts/src/tab-key.empirical.test.ts` — invert the malformed-tid probe into a regression assertion.

**Out of scope**
- Legacy short-form decode-vs-emit asymmetry (`np:`, `nc:`, `node:`). Documented separately in the empirical probes.
- Any change to encoder, decoder, or schema.

## Acceptance criteria

- [ ] `getTabKey({ kind: 'contextual', routeBase: 'infrastructure', tid: 'totally-bogus-input' })` returns `'infrastructure#invalid:totally-bogus-input'`.
- [ ] `getTabKey({ kind: 'contextual', routeBase: 'infrastructure' })` continues to return `'infrastructure'`.
- [ ] `getTabKey({ kind: 'contextual', routeBase: 'infrastructure', tid: 'node-name:foo' })` continues to return `'node-name:foo'`.
- [ ] `pnpm --filter @guepard/shell-contracts test` is green.

## Tasks

1. [001-update-tab-key-malformed-fallback-to-sentinel](001-update-tab-key-malformed-fallback-to-sentinel-[pending].md)

## Demo / verification

```bash
pnpm --filter @guepard/shell-contracts test
```

Expect 52 tests green. The renamed test now asserts the regression: malformed `tid` produces a sentinel key distinct from the base routeBase key.

## Questions surfaced

- 

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
