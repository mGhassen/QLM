---
story: ./story.md
status: done
layer: tests
files:
  - packages/domain/__tests__/services/ai/get-or-create-default-conversation.usecase.test.ts
---

# Test default-conversation service

## Purpose

Unit-test `GetOrCreateDefaultConversationService` (added in story 003 task 001). The idempotency property — "call twice, return same conversation" — is the key invariant for the panel bootstrap flow and deserves explicit coverage.

## Files

- `packages/domain/__tests__/services/ai/get-or-create-default-conversation.usecase.test.ts` — **new**.

## Acceptance

- [ ] No existing conversation for the user → service calls `create` once, returns the new conversation.
- [ ] Existing conversation for the user → service returns it, **never calls `create`**.
- [ ] Multiple conversations for the user → service returns the most recently updated one (sort by `updatedAt` desc).
- [ ] Conversation exists but for a different user → service treats as empty for this user and calls `create`.
- [ ] `pnpm --filter @guepard/domain test` passes with the new file.

## Test plan

```
pnpm --filter @guepard/domain test get-or-create-default-conversation
```

## Notes

- Mock `IConversationRepository` as a plain object stubbing `findByProjectId` and `create`. Other port methods can throw — not called by the service.
- Use `vi.fn()` for create so you can assert call count.
- Conversation fixtures: minimal `{ id, slug, projectId, createdBy, updatedAt, ... }` cast to `Conversation`.
