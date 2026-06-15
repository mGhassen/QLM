---
story: ./story.md
status: done
layer: shell
files:
  - packages/shell-runtime/src/resources/conversations.ts
  - packages/shell-runtime/src/client.ts
  - packages/shell-runtime/src/index.ts
---

# Add conversations shell resource

## Purpose

Expose the new `conversations` namespace on `useShell()` so downstream stories (005, 007, 008) can `await shell.conversations.{list, getBySlug, getDefaultForProject, create, update, delete}` plus React Query invalidators — auto-injecting project context and current user.

## Files

- `packages/shell-runtime/src/resources/conversations.ts` — **new**. Mirrors `notebooks.ts` shape: `createConversationsResource(repository, currentProjectId, currentUserId, queryClient)` returning `{ keys, list, getBySlug, getDefaultForProject, create, update, delete, invalidate }`. Wraps domain services from `@guepard/domain/services`.
- `packages/shell-runtime/src/client.ts` — add `conversations: ConversationsResource` to `ShellClient` type; compose inside the `useMemo`, passing `repositories.conversation`, `projectId`, `currentUserId`, `queryClient`. `currentUserId` is already destructured.
- `packages/shell-runtime/src/index.ts` — re-export `ConversationsResource` alongside the other resource type exports.

## Acceptance

- [x] `useShell().conversations` is typed and returns an object with `keys`, `list`, `getBySlug`, `getDefaultForProject`, `create`, `update`, `delete`, `invalidate`.
- [x] `list({ projectId? })` defaults `projectId` to the active project context.
- [x] `create(...)` and `update(...)` automatically set `createdBy` / `updatedBy` to `currentUserId` — callers do not pass them.
- [x] `getDefaultForProject({ projectId? })` calls the domain `GetOrCreateDefaultConversationService` from task 001.
- [x] `pnpm typecheck` at root passes (46/46 turbo tasks). `@guepard/shell-runtime` has no `typecheck` script of its own; verified via the workspace-wide check.

## Test plan

```
pnpm --filter @guepard/shell-runtime typecheck
```

## Notes

- Mirror `notebooks.ts` keys shape: `{ all, listByProject(projectId?), detail(id), bySlug(slug) }`.
- `invalidate` exposes `all`, `list`, `bySlug` — matches what the panel/tab will call.
- `delete` takes `id` (not slug) — matches `DeleteConversationService.execute(id)` signature.
