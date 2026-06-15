---
story: ./story.md
status: done
layer: domain
files:
  - packages/domain/src/services/conversation/get-or-create-default-conversation.usecase.ts
  - packages/domain/src/services/conversation/index.ts
---

# Add default-conversation domain service

## Purpose

Add `GetOrCreateDefaultConversationService` so the shell-runtime resource can bootstrap a per-(user, project) default conversation idempotently — return the user's most-recent existing conversation in the project, or create a new one with sensible defaults.

## Files

- `packages/domain/src/services/conversation/get-or-create-default-conversation.usecase.ts` — **new**. Class `GetOrCreateDefaultConversationService` taking `IConversationRepository` in constructor; `execute({ projectId, userId })` returns `Promise<ConversationOutput>`.
- `packages/domain/src/services/conversation/index.ts` — re-export the new service.

## Acceptance

- [x] `GetOrCreateDefaultConversationService` is reachable via `import { GetOrCreateDefaultConversationService } from '@guepard/domain/services'`.
- [x] `execute({ projectId, userId })` returns the user's most-recently-updated conversation in the project when one exists, else creates one with `title: 'Conversation'`, `seedMessage: ''`, `taskId: <fresh UUID>`, `datasources: []`, `createdBy: userId`. Note: `taskId` had to be a UUID (z.uuid() schema constraint), not `''` — used `crypto.randomUUID()` and added a follow-up note in the source comment to consider making `taskId` optional in the schema.
- [x] No new repository port methods added — composes existing `findByProjectId` and `create`.
- [x] `pnpm --filter @guepard/domain typecheck` passes.

## Test plan

```
pnpm --filter @guepard/domain typecheck
```

(Unit tests are added in task 003, not here — this task is the type/shape gate.)

## Notes

- Sort filtered list by `updatedAt` desc — return index 0 if non-empty.
- Use `ConversationEntity.create(...)` like `CreateConversationService` does — same construction path.
- Don't add a new port method; filtering by `createdBy` happens in-service (low-volume, panel-only path).
