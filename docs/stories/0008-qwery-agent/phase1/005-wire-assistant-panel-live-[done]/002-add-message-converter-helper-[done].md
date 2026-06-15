---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/utils/convert-messages.ts
---

# Add message converter helper

## Purpose

Convert `MessageOutput[]` (server shape) to `UIMessage[]` (`@ai-sdk/react` shape) so they can be passed to `<QweryAgentUI initialMessages={...} />` as bootstrap history.

## Files

- `packages/features/qwery-agent/src/utils/convert-messages.ts` — **new**. Port qwery-enterprise's `convertMessages` from `apps/web/lib/utils/messages-converter.ts`. Same signature: `convertMessages(messages: MessageOutput[] | undefined): UIMessage[] | undefined`.

## Acceptance

- [x] `convertMessages(undefined)` → `undefined` (verified by reading; behavioural test in story 010).
- [x] Modern messages (with `parts` + `role` in `content`) round-trip correctly via the same code path as qwery-enterprise.
- [x] Legacy messages (text-only `content`) reconstruct a single text part with the right role.
- [x] Uses `normalizeUIRole` and `messageRoleToUIRole` from `@guepard/shared/message-role-utils` (no inline role mapping).
- [x] `pnpm typecheck` passes. Required adding a local `src/types/turndown.d.ts` shim because qwery-agent's tsc walks into agent-factory-sdk's source (which transitively imports `turndown`) and doesn't pick up the sibling shim there. Also added `@guepard/agent-factory-sdk`, `@guepard/domain`, `@guepard/shell-runtime` to deps and `@tanstack/react-query` to devDeps.

## Test plan

```
pnpm typecheck
```

(Behavioural unit tests folded into story 010.)

## Notes

- Keep the helper feature-local (not in `@guepard/shared`) — no other consumer in phase 1.
- `UIMessage` type is exported from `@guepard/agent-factory-sdk` (re-exported from `ai`).
- Don't normalize timestamps beyond what qwery-enterprise does — its `createdAt` ISO conversion is enough for now.
