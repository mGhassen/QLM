---
story: ./story.md
status: pending
layer: shell
model: sonnet
files:
  - packages/shell-contracts/src/tab-key.ts
  - packages/shell-contracts/src/tab-key.empirical.test.ts
validation:
  kind: domain-test
  specs:
    - packages/shell-contracts/src/tab-key.empirical.test.ts
---

# Update tab-key malformed fallback to sentinel

Replace the malformed-`tid` fallback in `getTabKey` with a distinct sentinel string and convert the empirical probe into a regression assertion.

## Done when

- [ ] `tab-key.ts` `case 'contextual'` returns `${descriptor.routeBase}#invalid:${descriptor.tid}` when `decodeTabId(descriptor.tid)` is null.
- [ ] `tab-key.empirical.test.ts` first test renamed from "BUG: malformed tid collapses…" to "malformed tid produces sentinel key, no collision" and asserts `expect(malformedKey).not.toBe(baseKey)` and `expect(malformedKey).toBe('infrastructure#invalid:totally-bogus-input')`.
- [ ] The other three empirical probes are untouched (still green) and each carries a one-line comment marking it as documented-but-out-of-scope-for-this-story.
- [ ] `pnpm typecheck` and `pnpm --filter @guepard/shell-contracts test` are green.

## Notes

- The encoder (`encodeTabId`) is unchanged. Only the consumer-side identity strategy widens.
- `tabKeyMatches` is currently strict equality; the sentinel form makes that behavior correct under malformed input without any change to the matcher.
