---
story: ./story.md
status: done
layer: tests
files:
  - packages/features/qwery-agent/__tests__/convert-messages.test.ts
---

# Test convert-messages helper

## Purpose

Unit-test the `convertMessages` helper (ported from qwery-enterprise in story 005 task 002). Covers the modern `parts`-shaped content path, the legacy text fallback, and metadata merging.

## Files

- `packages/features/qwery-agent/__tests__/convert-messages.test.ts` — **new**.

## Acceptance

- [ ] `convertMessages(undefined)` returns `undefined`.
- [ ] `convertMessages([])` returns `[]`.
- [ ] Modern message (content with `parts` + `role`) → preserves `id`, normalizes role via `normalizeUIRole`, merges `content.metadata + rootMetadata + { createdAt }`, passes `parts` through.
- [ ] Legacy message (content is `{ text: '...' }` or plain string) → reconstructs a single `{ type: 'text', text }` part; role mapped via `messageRoleToUIRole`.
- [ ] `pnpm --filter @qlm/qwery-agent test` passes with the new tests green.

## Test plan

```
pnpm --filter @qlm/qwery-agent test convert-messages
```

## Notes

- Construct test fixtures inline as plain objects cast to `MessageOutput`; no need to round-trip through a real entity factory.
- Use Vitest's `expect(...).toEqual(...)` for deep comparison on `parts` and `metadata`.
- No need to test `convertUIMessageToContent` (inverse) — it's a trivial field copy and unused in phase 1.
